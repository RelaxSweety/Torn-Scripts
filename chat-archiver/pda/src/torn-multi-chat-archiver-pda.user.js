// ==UserScript==
// @name         Torn Multi-Chat Archiver PDA
// @namespace    RelaxSweety.Torn
// @version      0.1.4
// @description  Mobile/PDA chat archiver based on desktop v1.9; touch-friendly controls
// @match        https://www.torn.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    /* =========================================================
       CONFIG
       ========================================================= */

    const SETTINGS_KEY = 'RelaxSweety_TCA_PDA_v01_settings';
    const PANEL_POS_KEY = 'RelaxSweety_TCA_PDA_v01_panelPosition';
    const PANEL_MIN_KEY = 'RelaxSweety_TCA_PDA_v01_minimized';

    let scrollStep = 20;
    let scrollDelay = 40;

    const NO_NEW_RESULTS_MS = 5000;
    const END_RETRY_WAIT_MS = 5000;
    const STALL_GRACE_MS = 5000;
    const SCAN_THROTTLE = 100;
    const SCAN_DEBOUNCE = 75;
    const LIVE_MESSAGE_YIELD_MS = 250;

    const FULL_TIMESTAMP =
        /^\d{1,2}:\d{2}:\d{2}\s*-\s*\d{1,2}\/\d{1,2}\/\d{2,4}$/;

    const GROUP_TIMESTAMP_PATTERNS = [
        /^Today\s+\d{1,2}:\d{2}$/i,
        /^Yesterday\s+\d{1,2}:\d{2}$/i,
        /^\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}$/i,
        /^[A-Za-z]{3,9}\s+\d{1,2}:\d{2}$/i
    ];

    /* =========================================================
       STATE
       ========================================================= */

    let selectedChatId = '';
    let selectedChatName = '';
    let selectedChatType = '';

    let archive = new Map();
    let messageOrder = [];
    let privateIdCounter = 0;
    let sessionNumber = 0;

    let captureActive = false;
    let autoEnabled = false;
    let autoRunning = false;
    let autoPaused = false;

    let archiveComplete = false;
    let completionPromptOpen = false;

    let autoRunId = 0;

    let observer = null;
    let scanTimer = null;
    let currentScroller = null;

    let lastScrollScan = 0;
    let lastHistoricalProgressAt = 0;
    let autoStartedAt = 0;

    let rememberedOldestGroup = '';

    let customPromptResolver = null;
    let currentStatusNote = 'Ready';

    let autoYieldUntil = 0;

    /* =========================================================
       HELPERS
       ========================================================= */

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function escapeHTML(text) {
        return String(text ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function sanitizeFilename(text) {
        return String(text || 'chat')
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    function getTop(el) {
        try {
            return el.getBoundingClientRect().top;
        } catch {
            return 0;
        }
    }

    function isGroupTimestamp(text) {
        text = String(text || '').trim();
        return GROUP_TIMESTAMP_PATTERNS.some(pattern => pattern.test(text));
    }

    function getRecordSignature(record) {
        return [
            record.isSelf ? '1' : '0',
            record.playerId || '',
            record.player || '',
            record.message || ''
        ].join('\u241F');
    }

    function getRenderedSignature(record) {
        return [
            record.isSelf ? '1' : '0',
            record.playerId || '',
            record.player || '',
            record.message || ''
        ].join('\u241F');
    }

    function generatePrivateId() {
        privateIdCounter++;

        return [
            'private',
            sessionNumber,
            selectedChatId,
            Date.now().toString(36),
            privateIdCounter.toString(36)
        ].join('-');
    }

    function resetSessionArchive() {
        archive = new Map();
        messageOrder = [];
        privateIdCounter = 0;
        rememberedOldestGroup = '';

        lastHistoricalProgressAt = performance.now();
        lastScrollScan = 0;

        archiveComplete = false;
        autoPaused = false;
        completionPromptOpen = false;

        autoYieldUntil = 0;

        sessionNumber++;

        updateStatus();
    }

    function markHistoricalProgress(count) {
        if (count > 0) {
            lastHistoricalProgressAt = performance.now();
        }
    }

    function beginLiveMessageYield() {
        if (!autoRunning || completionPromptOpen) return;

        autoYieldUntil = Math.max(
            autoYieldUntil,
            performance.now() + LIVE_MESSAGE_YIELD_MS
        );

        currentStatusNote =
            'Live message detected — allowing Torn chat to settle';

        updateStatus();
    }

    /* =========================================================
       v1.9 USER-SCROLL EMULATION
       ========================================================= */

    function notifyTornOfUpwardScroll(scroller, amount) {
        if (!scroller) return;

        /*
         * A normal scrollTop assignment generates a scroll event,
         * but not a wheel event.
         *
         * Manual mouse-wheel scrolling generates the wheel event
         * BEFORE the browser changes the scroll position.
         *
         * v1.9 duplicates that order:
         *
         *   1. wheel event
         *   2. scrollTop movement
         *
         * The event bubbles, allowing React/Torn listeners on
         * ancestors to see it as well.
         */

        try {
            const rect = scroller.getBoundingClientRect();

            const wheelEvent = new WheelEvent('wheel', {
                bubbles: true,
                cancelable: true,
                composed: true,

                deltaX: 0,
                deltaY: -Math.abs(amount),
                deltaZ: 0,
                deltaMode: WheelEvent.DOM_DELTA_PIXEL,

                clientX: Math.round(rect.left + rect.width / 2),
                clientY: Math.round(rect.top + rect.height / 2),

                screenX: 0,
                screenY: 0,

                ctrlKey: false,
                shiftKey: false,
                altKey: false,
                metaKey: false
            });

            scroller.dispatchEvent(wheelEvent);

        } catch (error) {
            /*
             * Wheel emulation failing must never stop the archive.
             */
        }
    }

    function performAutoScrollStep(scroller) {
        if (!scroller) return;

        /*
         * Tell Torn about the upward scrolling first.
         */
        notifyTornOfUpwardScroll(
            scroller,
            scrollStep
        );

        /*
         * Then perform the actual movement.
         */
        const current = scroller.scrollTop;

        scroller.scrollTop = Math.max(
            0,
            current - scrollStep
        );
    }

    /* =========================================================
       CHAT DISCOVERY
       ========================================================= */

    function discoverChats() {
        const chats = [];
        const seen = new Set();

        const textareas = document.querySelectorAll(
            'textarea[placeholder="Type your message here..."]'
        );

        for (const textarea of textareas) {
            let root = textarea;

            for (
                let level = 0;
                level < 8 && root;
                level++, root = root.parentElement
            ) {
                const id = root.id || '';

                const cls =
                    typeof root.className === 'string'
                        ? root.className
                        : '';

                if (
                    id &&
                    (
                        cls.includes('root___Ex8tg') ||
                        id === 'global' ||
                        id === 'trade' ||
                        id === 'faction' ||
                        /^\d+$/.test(id)
                    )
                ) {
                    break;
                }
            }

            if (!root || !root.id || seen.has(root.id)) continue;

            seen.add(root.id);

            const id = root.id;

            let type = 'Private';

            if (id === 'global') {
                type = 'Global';
            } else if (id === 'trade') {
                type = 'Trade';
            } else if (id === 'faction') {
                type = 'Faction';
            }

            let name = '';

            if (type === 'Private') {
                const title = root.querySelector('[class*="title___"]');

                const profile =
                    root.querySelector(
                        `a[href*="/profiles.php?XID=${id}"]`
                    ) ||
                    root.querySelector(
                        'a[href*="/profiles.php?XID="]'
                    );

                const titleSpan =
                    profile?.parentElement?.querySelector('span[title]');

                name =
                    title?.textContent?.trim() ||
                    titleSpan?.getAttribute('title') ||
                    titleSpan?.textContent?.trim() ||
                    `Private ${id}`;

            } else {
                const lines = (root.innerText || '')
                    .split('\n')
                    .map(x => x.trim())
                    .filter(Boolean);

                name = lines[0] || type;
            }

            chats.push({
                id,
                name,
                type,
                root
            });
        }

        return chats;
    }

    function getSelectedChat() {
        if (!selectedChatId) return null;
        return document.getElementById(selectedChatId);
    }

    function getChatLabel(chat) {
        if (!chat) return '';

        if (chat.type === 'Private') {
            return `${chat.name} [Private]`;
        }

        if (chat.type === 'Faction') {
            return `${chat.name} [Faction]`;
        }

        return chat.name;
    }

    /* =========================================================
       PRIVATE PARTICIPANT
       ========================================================= */

    function getPrivateParticipant() {
        const chat = getSelectedChat();

        if (!chat) {
            return {
                player: selectedChatName,
                playerId: selectedChatId
            };
        }

        const profile =
            chat.querySelector(
                `a[href*="/profiles.php?XID=${selectedChatId}"]`
            ) ||
            chat.querySelector(
                'a[href*="/profiles.php?XID="]'
            );

        let playerId = selectedChatId;

        if (profile) {
            try {
                playerId =
                    new URL(profile.href, location.origin)
                        .searchParams
                        .get('XID') ||
                    selectedChatId;
            } catch {}
        }

        const title = chat.querySelector('[class*="title___"]');

        const titleSpan =
            profile?.parentElement?.querySelector('span[title]');

        const player =
            title?.textContent?.trim() ||
            titleSpan?.getAttribute('title') ||
            titleSpan?.textContent?.trim() ||
            selectedChatName ||
            `Player ${playerId}`;

        return {
            player,
            playerId
        };
    }

    /* =========================================================
       SCROLLER
       ========================================================= */

    function getScroller() {
        const chat = getSelectedChat();

        if (!chat) return null;

        const known =
            chat.querySelector('[class*="scrollWrapper___"]');

        if (
            known &&
            known.scrollHeight > known.clientHeight + 20
        ) {
            return known;
        }

        const candidates =
            [...chat.querySelectorAll('*')]
                .filter(el =>
                    el.scrollHeight > el.clientHeight + 20
                )
                .sort(
                    (a, b) =>
                        (b.scrollHeight - b.clientHeight) -
                        (a.scrollHeight - a.clientHeight)
                );

        return candidates[0] || null;
    }

    /* =========================================================
       STANDARD MESSAGE EXTRACTION
       ========================================================= */

    function extractStandardMessage(sender) {
        try {
            const playerId =
                new URL(sender.href, location.origin)
                    .searchParams
                    .get('XID');

            if (!playerId) return null;

            const messageId =
                (sender.id || '').split(':')[0];

            if (!messageId) return null;

            const senderContainer =
                sender.closest('[class*="senderContainer"]');

            if (!senderContainer) return null;

            const box = senderContainer.parentElement;

            if (!box) return null;

            const body =
                box.querySelector('[class*="message___"]');

            if (!body) return null;

            const virtualItem =
                box.closest('[class*="virtualItem"]');

            if (!virtualItem) return null;

            const wrapper =
                virtualItem.parentElement || virtualItem;

            return {
                messageId,

                player:
                    sender.textContent
                        .trim()
                        .replace(/:$/, ''),

                playerId,

                isSelf: false,

                message:
                    body.textContent.trim(),

                virtualItem,
                wrapper,
                body,
                box,

                top:
                    getTop(wrapper)
            };

        } catch {
            return null;
        }
    }

    /*
     * PDA can omit desktop sender link IDs. Use the existing desktop
     * extractor first, then discover messages from their body nodes.
     * Only accept a message when a nearby profile link identifies
     * its sender. Stable DOM identifiers prevent duplicate capture.
     */
    function extractPdaStandardFallback(chat, existing) {
        const seen = new Set(existing.map(m => m.messageId));
        const bodies = chat.querySelectorAll('[class*="message___"]');
        const recovered = [];
        for (const body of bodies) {
            const message = body.textContent?.trim();
            if (!message) continue;
            const box = body.closest('[class*="virtualItem"]') ||
                        body.closest('[class*="messageContainer"]') ||
                        body.parentElement?.parentElement;
            if (!box) continue;
            const sender = box.querySelector('a[href*="profiles.php?XID="]') ||
                           body.parentElement?.parentElement?.querySelector('a[href*="profiles.php?XID="]');
            if (!sender) continue;
            let playerId;
            try {
                playerId = new URL(sender.href, location.origin).searchParams.get('XID');
            } catch { continue; }
            if (!playerId) continue;
            const rawId = sender.id?.split(':')[0] ||
                          box.getAttribute('data-message-id') ||
                          box.getAttribute('data-id') ||
                          box.id;
            if (!rawId) continue;
            const messageId = String(rawId);
            if (seen.has(messageId)) continue;
            seen.add(messageId);
            recovered.push({
                messageId, player: sender.textContent?.trim().replace(/:$/, '') || 'Unknown',
                playerId, isSelf: false, message,
                virtualItem: box, wrapper: box, body, box,
                top: getTop(box)
            });
        }
        return recovered;
    }

    function buildStandardRenderedMessages() {
        const chat = getSelectedChat();

        if (!chat) return [];

        const senders =
            chat.querySelectorAll(
                'a[href*="/profiles.php?XID="][id*=":"]'
            );

        const messages = [];

        for (const sender of senders) {
            const msg = extractStandardMessage(sender);

            if (msg) messages.push(msg);
        }

        messages.push(...extractPdaStandardFallback(chat, messages));
        messages.sort((a, b) => a.top - b.top);

        return messages;
    }

    /* =========================================================
       PRIVATE MESSAGE EXTRACTION
       ========================================================= */

    function buildPrivateRenderedMessages() {
        const chat = getSelectedChat();

        if (!chat) return [];

        const participant =
            getPrivateParticipant();

        const items =
            [...chat.querySelectorAll('[class*="virtualItem"]')];
        if (!items.length) {
            for (const body of chat.querySelectorAll('[class*="message___"]')) {
                const container = body.closest('[class*="messageContainer"]') ||
                                  body.parentElement?.parentElement;
                if (container && !items.includes(container)) items.push(container);
            }
        }

        const messages = [];

        for (const item of items) {
            const body =
                item.matches('[class*="message___"]')
                    ? item
                    : item.querySelector('[class*="message___"]');

            if (!body) continue;

            const message =
                body.textContent?.trim() || '';

            if (!message) continue;

            const root = item.firstElementChild;

            const rootClass =
                typeof root?.className === 'string'
                    ? root.className
                    : '';

            const isSelf =
                rootClass.includes('self___') ||
                !!item.querySelector('[class*="self___"]');

            const wrapper =
                item.parentElement || item;

            messages.push({
                messageId: null,

                player:
                    isSelf
                        ? 'RelaxSweety'
                        : participant.player,

                playerId:
                    isSelf
                        ? ''
                        : participant.playerId,

                isSelf,

                message,

                virtualItem: item,
                wrapper,
                body,

                box:
                    body.closest('[data-is-tooltip-opened]') ||
                    body.parentElement,

                top:
                    getTop(wrapper)
            });
        }

        messages.sort((a, b) => a.top - b.top);

        return messages;
    }

    /* =========================================================
       GROUP TIMESTAMPS
       ========================================================= */

    function collectGroupSeparators() {
        const chat = getSelectedChat();

        if (!chat) return [];

        const results = [];
        const seen = new Set();

        const candidates =
            chat.querySelectorAll('div, span, p');

        for (const el of candidates) {
            if (
                el.children.length > 2 ||
                seen.has(el)
            ) {
                continue;
            }

            const text =
                el.textContent?.trim() || '';

            if (
                !text ||
                text.length > 40 ||
                !isGroupTimestamp(text)
            ) {
                continue;
            }

            seen.add(el);

            results.push({
                text,
                top: getTop(el)
            });
        }

        results.sort((a, b) => a.top - b.top);

        const cleaned = [];

        for (const item of results) {
            const duplicate =
                cleaned.some(
                    existing =>
                        existing.text === item.text &&
                        Math.abs(existing.top - item.top) < 3
                );

            if (!duplicate) {
                cleaned.push(item);
            }
        }

        return cleaned;
    }

    function assignGroupTimestamps(messages, separators) {
        const result = new Map();

        let current =
            rememberedOldestGroup || '';

        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];

            for (const separator of separators) {
                if (separator.top <= message.top + 2) {
                    current = separator.text;
                } else {
                    break;
                }
            }

            if (current) {
                result.set(i, current);
            }
        }

        if (separators.length) {
            rememberedOldestGroup =
                separators[0].text;
        }

        return result;
    }

    /* =========================================================
       PRIVATE OVERLAP
       ========================================================= */

    function findBestPrivateOverlap(rendered) {
        if (
            !rendered.length ||
            !messageOrder.length
        ) {
            return null;
        }

        const renderedSigs =
            rendered.map(getRenderedSignature);

        const archiveSigs =
            messageOrder.map(id => {
                const record = archive.get(id);

                return record
                    ? getRecordSignature(record)
                    : '';
            });

        let best = null;

        for (
            let offset = -rendered.length + 1;
            offset < archiveSigs.length;
            offset++
        ) {
            let compared = 0;
            let matches = 0;

            for (
                let r = 0;
                r < renderedSigs.length;
                r++
            ) {
                const a = offset + r;

                if (
                    a < 0 ||
                    a >= archiveSigs.length
                ) {
                    continue;
                }

                compared++;

                if (
                    renderedSigs[r] ===
                    archiveSigs[a]
                ) {
                    matches++;
                }
            }

            if (!compared) continue;
            if (matches !== compared) continue;

            if (
                !best ||
                compared > best.compared
            ) {
                best = {
                    offset,
                    compared
                };
            }
        }

        return best;
    }

    function addPrivateRecord(rendered, groupTimestamp = '') {
        const id = generatePrivateId();

        const record = {
            chat: selectedChatName,
            chatId: selectedChatId,

            messageId: id,
            sourceMessageId: '',

            player: rendered.player,
            playerId: rendered.playerId,

            isSelf: rendered.isSelf,

            exactTimestamp: '',

            groupTimestamp:
                groupTimestamp || '',

            message:
                rendered.message
        };

        archive.set(id, record);

        return id;
    }

    /* =========================================================
       PRIVATE CAPTURE
       ========================================================= */

    function capturePrivateMessages() {
        const rendered =
            buildPrivateRenderedMessages();

        if (!rendered.length) {
            return {
                added: 0,
                historicalAdded: 0,
                liveAdded: 0,
                updated: 0
            };
        }

        const separators =
            collectGroupSeparators();

        const groups =
            assignGroupTimestamps(
                rendered,
                separators
            );

        let added = 0;
        let historicalAdded = 0;
        let liveAdded = 0;
        let updated = 0;

        if (!messageOrder.length) {
            for (
                let i = 0;
                i < rendered.length;
                i++
            ) {
                const id =
                    addPrivateRecord(
                        rendered[i],
                        groups.get(i) || ''
                    );

                messageOrder.push(id);
                added++;
            }

            return {
                added,
                historicalAdded: 0,
                liveAdded: 0,
                updated
            };
        }

        const overlap =
            findBestPrivateOverlap(rendered);

        if (!overlap) {
            return {
                added: 0,
                historicalAdded: 0,
                liveAdded: 0,
                updated: 0
            };
        }

        const { offset } = overlap;

        const olderCount =
            Math.max(0, -offset);

        if (olderCount) {
            const olderIds = [];

            for (
                let r = 0;
                r < olderCount;
                r++
            ) {
                const id =
                    addPrivateRecord(
                        rendered[r],
                        groups.get(r) || ''
                    );

                olderIds.push(id);

                added++;
                historicalAdded++;
            }

            messageOrder =
                olderIds.concat(messageOrder);
        }

        const correctedOffset =
            offset + olderCount;

        for (
            let r = olderCount;
            r < rendered.length;
            r++
        ) {
            const archiveIndex =
                correctedOffset + r;

            if (
                archiveIndex < 0 ||
                archiveIndex >= messageOrder.length
            ) {
                continue;
            }

            const id =
                messageOrder[archiveIndex];

            const record =
                archive.get(id);

            if (!record) continue;

            const group =
                groups.get(r) || '';

            if (
                group &&
                !record.groupTimestamp
            ) {
                record.groupTimestamp = group;
                updated++;
            }
        }

        const firstNewerRenderedIndex =
            Math.max(
                olderCount,
                messageOrder.length -
                    correctedOffset
            );

        for (
            let r = firstNewerRenderedIndex;
            r < rendered.length;
            r++
        ) {
            const id =
                addPrivateRecord(
                    rendered[r],
                    groups.get(r) || ''
                );

            messageOrder.push(id);

            added++;
            liveAdded++;
        }

        return {
            added,
            historicalAdded,
            liveAdded,
            updated
        };
    }

    /* =========================================================
       STANDARD CAPTURE
       ========================================================= */

    function captureStandardMessages() {
        const messages =
            buildStandardRenderedMessages();

        if (!messages.length) {
            return {
                added: 0,
                historicalAdded: 0,
                liveAdded: 0,
                updated: 0
            };
        }

        const separators =
            collectGroupSeparators();

        const groups =
            assignGroupTimestamps(
                messages,
                separators
            );

        let added = 0;
        let historicalAdded = 0;
        let liveAdded = 0;
        let updated = 0;

        const knownIndices = [];

        for (let i = 0; i < messages.length; i++) {
            if (
                archive.has(
                    messages[i].messageId
                )
            ) {
                knownIndices.push(i);
            }
        }

        const initialWindow =
            archive.size === 0;

        const firstKnown =
            knownIndices.length
                ? knownIndices[0]
                : -1;

        const lastKnown =
            knownIndices.length
                ? knownIndices[knownIndices.length - 1]
                : -1;

        const olderIds = [];
        const newerIds = [];

        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];

            const groupTimestamp =
                groups.get(i) || '';

            let record =
                archive.get(msg.messageId);

            if (!record) {
                record = {
                    chat:
                        selectedChatName,

                    chatId:
                        selectedChatId,

                    messageId:
                        msg.messageId,

                    sourceMessageId:
                        msg.messageId,

                    player:
                        msg.player,

                    playerId:
                        msg.playerId,

                    isSelf:
                        false,

                    exactTimestamp:
                        '',

                    groupTimestamp,

                    message:
                        msg.message
                };

                archive.set(
                    msg.messageId,
                    record
                );

                added++;

                if (initialWindow) {
                    newerIds.push(
                        msg.messageId
                    );

                } else if (knownIndices.length) {

                    if (i < firstKnown) {
                        olderIds.push(
                            msg.messageId
                        );

                        historicalAdded++;

                    } else if (i > lastKnown) {
                        newerIds.push(
                            msg.messageId
                        );

                        liveAdded++;

                    } else {
                        newerIds.push(
                            msg.messageId
                        );

                        liveAdded++;
                    }

                } else {
                    newerIds.push(
                        msg.messageId
                    );
                }

            } else {
                if (
                    groupTimestamp &&
                    !record.groupTimestamp
                ) {
                    record.groupTimestamp =
                        groupTimestamp;

                    updated++;
                }

                if (
                    record.message !==
                    msg.message
                ) {
                    record.message =
                        msg.message;

                    updated++;
                }
            }
        }

        if (olderIds.length) {
            messageOrder =
                olderIds.concat(
                    messageOrder
                );
        }

        for (const id of newerIds) {
            if (!messageOrder.includes(id)) {
                messageOrder.push(id);
            }
        }

        return {
            added,
            historicalAdded,
            liveAdded,
            updated
        };
    }

    /* =========================================================
       SCAN
       ========================================================= */

    function scan() {
        if (!captureActive) {
            return {
                added: 0,
                historicalAdded: 0,
                liveAdded: 0,
                updated: 0
            };
        }

        let result;

        if (selectedChatType === 'Private') {
            result =
                capturePrivateMessages();
        } else {
            result =
                captureStandardMessages();
        }

        if (result.historicalAdded > 0) {
            markHistoricalProgress(
                result.historicalAdded
            );
        }

        if (
            result.liveAdded > 0 &&
            autoRunning &&
            !completionPromptOpen
        ) {
            beginLiveMessageYield();
        }

        updateStatus();

        return result;
    }

    function scheduleScan() {
        if (!captureActive) return;

        clearTimeout(scanTimer);

        scanTimer =
            setTimeout(
                scan,
                SCAN_DEBOUNCE
            );
    }

    function scanDuringScroll() {
        if (!captureActive) return;

        const now =
            performance.now();

        if (
            now - lastScrollScan >=
            SCAN_THROTTLE
        ) {
            lastScrollScan = now;
            scan();
        }

        scheduleScan();
    }

    function handleChatMutation() {
        if (!captureActive) return;

        const result = scan();

        if (
            result.liveAdded > 0 &&
            autoRunning
        ) {
            beginLiveMessageYield();
        }

        scheduleScan();
    }

    /* =========================================================
       EXACT TIMESTAMP
       ========================================================= */

    function getVisibleExactTimestamp() {
        const elements =
            document.querySelectorAll(
                'body p, body span'
            );

        for (const el of elements) {
            const text =
                el.textContent?.trim() || '';

            if (
                FULL_TIMESTAMP.test(text) &&
                el.getClientRects().length
            ) {
                return text;
            }
        }

        return '';
    }

    document.addEventListener(
        'mousemove',

        event => {
            if (!captureActive) return;

            const timestamp =
                getVisibleExactTimestamp();

            if (!timestamp) return;

            const target =
                document.elementFromPoint(
                    event.clientX,
                    event.clientY
                );

            if (!target) return;

            const chat =
                getSelectedChat();

            if (
                !chat ||
                !chat.contains(target)
            ) {
                return;
            }

            const item =
                target.closest(
                    '[class*="virtualItem"]'
                );

            if (!item) return;

            if (
                selectedChatType !== 'Private'
            ) {
                const sender =
                    item.querySelector(
                        'a[href*="/profiles.php?XID="][id*=":"]'
                    );

                if (!sender) return;

                const msg =
                    extractStandardMessage(sender);

                if (!msg) return;

                const record =
                    archive.get(
                        msg.messageId
                    );

                if (
                    record &&
                    record.exactTimestamp !==
                        timestamp
                ) {
                    record.exactTimestamp =
                        timestamp;

                    updateStatus();
                }

                return;
            }

            const rendered =
                buildPrivateRenderedMessages();

            const renderedIndex =
                rendered.findIndex(
                    msg =>
                        msg.virtualItem === item
                );

            if (renderedIndex < 0) return;

            const overlap =
                findBestPrivateOverlap(
                    rendered
                );

            if (!overlap) return;

            const olderCount =
                Math.max(
                    0,
                    -overlap.offset
                );

            const archiveIndex =
                overlap.offset +
                olderCount +
                renderedIndex;

            const id =
                messageOrder[
                    archiveIndex
                ];

            if (!id) return;

            const record =
                archive.get(id);

            if (
                record &&
                record.exactTimestamp !==
                    timestamp
            ) {
                record.exactTimestamp =
                    timestamp;

                updateStatus();
            }
        },

        {
            passive: true
        }
    );

    /* =========================================================
       CHAT SELECTION
       ========================================================= */

    function refreshChatSelector(
        preserveSelection = true
    ) {
        const select =
            document.getElementById(
                'tca-chat-select'
            );

        if (!select) return;

        const previous =
            preserveSelection
                ? selectedChatId
                : '';

        const chats =
            discoverChats();

        select.innerHTML = '';

        if (!chats.length) {
            const option =
                document.createElement(
                    'option'
                );

            option.value = '';
            option.textContent =
                'No open chats detected';

            select.appendChild(option);

            return;
        }

        for (const chat of chats) {
            const option =
                document.createElement(
                    'option'
                );

            option.value =
                chat.id;

            option.textContent =
                getChatLabel(chat);

            select.appendChild(option);
        }

        const chosen =
            chats.find(
                chat =>
                    chat.id === previous
            ) ||
            chats.find(
                chat =>
                    chat.id === 'faction'
            ) ||
            chats[0];

        select.value =
            chosen.id;

        switchChat(
            chosen.id
        );
    }

    function switchChat(chatId) {
        if (
            captureActive &&
            chatId !== selectedChatId
        ) {
            const select =
                document.getElementById(
                    'tca-chat-select'
                );

            if (select) {
                select.value =
                    selectedChatId;
            }

            alert(
                'Turn Capture off before switching chats.'
            );

            return;
        }

        const chat =
            discoverChats().find(
                item =>
                    item.id === chatId
            );

        if (!chat) return;

        selectedChatId =
            chat.id;

        selectedChatName =
            chat.name;

        selectedChatType =
            chat.type;

        archive = new Map();
        messageOrder = [];
        privateIdCounter = 0;
        rememberedOldestGroup = '';

        archiveComplete = false;
        autoPaused = false;
        completionPromptOpen = false;

        autoYieldUntil = 0;

        lastHistoricalProgressAt =
            performance.now();

        setStatus(
            `Selected ${getChatLabel(chat)} — ready for new session`
        );
    }

    /* =========================================================
       YES / NO PROMPT
       ========================================================= */

    function showYesNoPrompt(
        title,
        question
    ) {
        return new Promise(
            resolve => {
                const overlay =
                    document.getElementById(
                        'tca-prompt-overlay'
                    );

                const titleEl =
                    document.getElementById(
                        'tca-prompt-title'
                    );

                const questionEl =
                    document.getElementById(
                        'tca-prompt-question'
                    );

                const yesButton =
                    document.getElementById(
                        'tca-prompt-yes'
                    );

                const noButton =
                    document.getElementById(
                        'tca-prompt-no'
                    );

                if (
                    !overlay ||
                    !titleEl ||
                    !questionEl ||
                    !yesButton ||
                    !noButton
                ) {
                    resolve(false);
                    return;
                }

                titleEl.textContent =
                    title;

                questionEl.textContent =
                    question;

                overlay.style.display =
                    'flex';

                customPromptResolver =
                    answer => {
                        overlay.style.display =
                            'none';

                        customPromptResolver =
                            null;

                        resolve(answer);
                    };

                yesButton.onclick =
                    () => {
                        if (customPromptResolver) {
                            customPromptResolver(true);
                        }
                    };

                noButton.onclick =
                    () => {
                        if (customPromptResolver) {
                            customPromptResolver(false);
                        }
                    };
            }
        );
    }

    /* =========================================================
       CAPTURE CONTROL
       ========================================================= */

    function startCapture() {
        if (captureActive) return;

        const chat =
            getSelectedChat();

        const scroller =
            getScroller();

        if (
            !chat ||
            !scroller
        ) {
            alert(
                'Select an open chat first.'
            );

            return;
        }

        resetSessionArchive();

        captureActive = true;
        currentScroller = scroller;
        hideFullPanel();

        scan();

        lastHistoricalProgressAt =
            performance.now();

        observer =
            new MutationObserver(
                handleChatMutation
            );

        observer.observe(
            chat,
            {
                childList: true,
                subtree: true
            }
        );

        currentScroller.addEventListener(
            'scroll',
            scanDuringScroll,
            {
                passive: true
            }
        );

        updateIndicators();

        if (autoEnabled) {
            setStatus(
                'New archive session started — Auto armed'
            );

            setTimeout(
                () => {
                    if (
                        captureActive &&
                        autoEnabled &&
                        !archiveComplete
                    ) {
                        startAutoRun();
                    }
                },
                150
            );

        } else {
            setStatus(
                'New archive session started'
            );
        }
    }

    function stopCapture(
        note = ''
    ) {
        if (captureActive) {
            scan();
        }

        captureActive = false;

        stopAutoRun(false);

        if (observer) {
            observer.disconnect();
            observer = null;
        }

        if (currentScroller) {
            currentScroller.removeEventListener(
                'scroll',
                scanDuringScroll
            );

            currentScroller = null;
        }

        clearTimeout(scanTimer);

        autoYieldUntil = 0;

        updateIndicators();

        setStatus(
            note ||
            (
                autoEnabled
                    ? 'Capture off — Auto armed'
                    : 'Capture stopped'
            )
        );
    }

    /* =========================================================
       AUTO CONTROL
       ========================================================= */

    function toggleAutoSetting() {
        autoEnabled =
            !autoEnabled;

        if (!autoEnabled) {
            autoPaused = false;

            stopAutoRun(false);

            autoYieldUntil = 0;

            updateIndicators();

            setStatus(
                captureActive
                    ? 'Capture running — Auto off'
                    : 'Auto off'
            );

            return;
        }

        updateIndicators();

        if (!captureActive) {
            setStatus(
                'Auto armed — waiting for Capture'
            );

            return;
        }

        archiveComplete = false;
        autoPaused = false;

        setStatus(
            'Auto armed — starting'
        );

        startAutoRun();
    }

    /* =========================================================
       FINISH
       ========================================================= */

    function finishArchivingSession() {
        archiveComplete = true;
        autoPaused = false;
        completionPromptOpen = false;

        autoEnabled = false;
        autoYieldUntil = 0;

        stopCapture(
            'ARCHIVING COMPLETE — ready to export'
        );

        updateIndicators();
    }

    /* =========================================================
       NO NEW HISTORY
       ========================================================= */

    async function handleNoNewResults(
        runId
    ) {
        if (
            completionPromptOpen ||
            !autoRunning ||
            !autoEnabled ||
            !captureActive ||
            runId !== autoRunId
        ) {
            return;
        }

        autoRunning = false;
        autoRunId++;

        autoPaused = true;
        completionPromptOpen = true;

        autoYieldUntil = 0;

        scan();

        updateIndicators();

        setStatus(
            'No new older history detected — scrolling paused'
        );

        const complete =
            await showYesNoPrompt(
                'History Check',
                'Is the available chat history complete?'
            );

        if (complete) {
            completionPromptOpen = false;

            finishArchivingSession();

            return;
        }

        setStatus(
            'Awaiting archive decision'
        );

        const continueArchiving =
            await showYesNoPrompt(
                'Continue Archiving?',
                'Should archiving continue?'
            );

        if (!continueArchiving) {
            completionPromptOpen = false;

            finishArchivingSession();

            return;
        }

        completionPromptOpen = false;
        archiveComplete = false;
        autoPaused = false;

        lastHistoricalProgressAt =
            performance.now();

        autoStartedAt =
            performance.now();

        autoYieldUntil = 0;

        setStatus(
            'Continuing from current chat position'
        );

        updateIndicators();

        if (
            captureActive &&
            autoEnabled
        ) {
            setTimeout(
                () => {
                    if (
                        captureActive &&
                        autoEnabled &&
                        !completionPromptOpen &&
                        !archiveComplete
                    ) {
                        startAutoRun();
                    }
                },
                100
            );
        }
    }

    /* =========================================================
       AUTO SCROLL
       ========================================================= */

    async function startAutoRun() {
        if (
            autoRunning ||
            !autoEnabled ||
            !captureActive ||
            archiveComplete ||
            completionPromptOpen
        ) {
            return;
        }

        updateScrollSettings();

        let scroller =
            getScroller();

        if (!scroller) {
            setStatus(
                'Unable to locate chat scrollbar'
            );

            return;
        }

        autoPaused = false;
        autoRunning = true;

        autoStartedAt =
            performance.now();

        lastHistoricalProgressAt =
            performance.now();

        autoYieldUntil = 0;

        const runId =
            ++autoRunId;

        updateIndicators();

        setStatus(
            'Scanning older history'
        );
        updatePlayBar();

        while (
            autoRunning &&
            autoEnabled &&
            captureActive &&
            !archiveComplete &&
            !completionPromptOpen &&
            runId === autoRunId
        ) {
            const nowBeforeScroll =
                performance.now();

            if (
                nowBeforeScroll <
                autoYieldUntil
            ) {
                const remaining =
                    autoYieldUntil -
                    nowBeforeScroll;

                await sleep(
                    Math.min(
                        50,
                        Math.max(
                            10,
                            remaining
                        )
                    )
                );

                continue;
            }

            const liveScroller =
                getScroller();

            if (liveScroller) {
                scroller =
                    liveScroller;
            }

            if (!scroller) {
                break;
            }

            /*
             * v1.9:
             *
             * Do not directly assign scrollTop here.
             *
             * performAutoScrollStep() first emits the same
             * direction of wheel event produced by manual
             * upward scrolling and THEN changes scrollTop.
             */
            // Capture the outgoing virtualized window before it disappears.
            scan();
            performAutoScrollStep(
                scroller
            );

            await sleep(
                scrollDelay
            );

            if (
                !autoRunning ||
                !autoEnabled ||
                !captureActive ||
                archiveComplete ||
                completionPromptOpen ||
                runId !== autoRunId
            ) {
                break;
            }

            if (
                performance.now() <
                autoYieldUntil
            ) {
                continue;
            }

            // PDA virtual lists may change without emitting a scroll event.
            scan();
            const now =
                performance.now();

            if (
                now - lastScrollScan >=
                SCAN_THROTTLE
            ) {
                lastScrollScan = now;
                scan();
            }

            if (
                performance.now() <
                autoYieldUntil
            ) {
                continue;
            }

            const runAge =
                now -
                autoStartedAt;

            const noHistoryAge =
                now -
                lastHistoricalProgressAt;

            if (
                runAge >=
                    STALL_GRACE_MS &&
                noHistoryAge >=
                    NO_NEW_RESULTS_MS
            ) {
                const before =
                    lastHistoricalProgressAt;

                /*
                 * A suspected end of history is not yet confirmed.
                 * Let Torn finish loading for five seconds before
                 * trying another upward scroll. Do not reposition
                 * the chat or reset the archive.
                 */
                setStatus('Possible history end — waiting 5 seconds before retry');
                await sleep(END_RETRY_WAIT_MS);

                if (
                    !autoRunning ||
                    !autoEnabled ||
                    !captureActive ||
                    archiveComplete ||
                    completionPromptOpen ||
                    runId !== autoRunId
                ) {
                    return;
                }

                scan();

                if (lastHistoricalProgressAt > before) {
                    setStatus('Older history loaded — resuming scroll');
                    continue;
                }

                const retryScroller = getScroller() || scroller;
                performAutoScrollStep(retryScroller);
                await sleep(Math.max(scrollDelay, 200));
                scan();

                if (
                    performance.now() <
                    autoYieldUntil
                ) {
                    continue;
                }

                if (
                    lastHistoricalProgressAt >
                    before
                ) {
                    continue;
                }

                await handleNoNewResults(
                    runId
                );

                return;
            }
        }

        if (
            runId === autoRunId
        ) {
            autoRunning = false;
            updateIndicators();
        }
    }

    function stopAutoRun(
        update = true
    ) {
        if (autoRunning) {
            autoRunning = false;
            autoRunId++;
        }

        autoYieldUntil = 0;

        if (update) {
            updateIndicators();
            updateStatus();
        }
    }

    /* =========================================================
       SETTINGS
       ========================================================= */

    function loadSettings() {
        try {
            let raw =
                localStorage.getItem(
                    SETTINGS_KEY
                );

            if (!raw) {
                const oldKeys = [
                    'RelaxSweety_TCA_v18_settings',
                    'RelaxSweety_TCA_v17_settings',
                    'RelaxSweety_TCA_v16_settings',
                    'RelaxSweety_TCA_v15_settings',
                    'RelaxSweety_TCA_v14_settings'
                ];

                for (const key of oldKeys) {
                    raw =
                        localStorage.getItem(
                            key
                        );

                    if (raw) break;
                }
            }

            if (!raw) return;

            const settings =
                JSON.parse(raw);

            if (
                Number.isFinite(
                    settings.step
                )
            ) {
                scrollStep =
                    Math.max(
                        1,
                        Math.min(
                            50,
                            settings.step
                        )
                    );
            }

            if (
                Number.isFinite(
                    settings.delay
                )
            ) {
                scrollDelay =
                    Math.max(
                        15,
                        Math.min(
                            500,
                            settings.delay
                        )
                    );
            }

        } catch {}
    }

    function updateScrollSettings() {
        const step =
            parseInt(
                document.getElementById(
                    'tca-step'
                )?.value,
                10
            );

        const delay =
            parseInt(
                document.getElementById(
                    'tca-delay'
                )?.value,
                10
            );

        if (Number.isFinite(step)) {
            scrollStep =
                Math.max(
                    1,
                    Math.min(
                        50,
                        step
                    )
                );
        }

        if (Number.isFinite(delay)) {
            scrollDelay =
                Math.max(
                    15,
                    Math.min(
                        500,
                        delay
                    )
                );
        }

        const stepInput =
            document.getElementById(
                'tca-step'
            );

        const delayInput =
            document.getElementById(
                'tca-delay'
            );

        if (stepInput) {
            stepInput.value =
                scrollStep;
        }

        if (delayInput) {
            delayInput.value =
                scrollDelay;
        }

        localStorage.setItem(
            SETTINGS_KEY,

            JSON.stringify({
                step: scrollStep,
                delay: scrollDelay
            })
        );
    }

    /* =========================================================
       EXPORT
       ========================================================= */

    function csvEscape(value) {
        return (
            '"' +
            String(value ?? '')
                .replaceAll(
                    '"',
                    '""'
                ) +
            '"'
        );
    }

    function getOrderedRecords() {
        const result = [];
        const used = new Set();

        for (const id of messageOrder) {
            const record =
                archive.get(id);

            if (record) {
                result.push(record);
                used.add(id);
            }
        }

        for (
            const [id, record] of
            archive.entries()
        ) {
            if (!used.has(id)) {
                result.push(record);
            }
        }

        return result;
    }

    function exportCSV() {
        const rows = [[
            'Chat',
            'Chat ID',
            'Message ID',
            'Player',
            'Player ID',
            'Direction',
            'Exact Timestamp',
            'Group Timestamp',
            'Message'
        ]];

        for (
            const msg of
            getOrderedRecords()
        ) {
            rows.push([
                msg.chat ||
                    selectedChatName,

                msg.chatId ||
                    selectedChatId,

                msg.messageId,

                msg.player,

                msg.playerId,

                msg.isSelf
                    ? 'Self'
                    : 'Other',

                msg.exactTimestamp,

                msg.groupTimestamp,

                msg.message
            ]);
        }

        const csv =
            '\uFEFF' +
            rows
                .map(
                    row =>
                        row
                            .map(csvEscape)
                            .join(',')
                )
                .join('\r\n');

        download(
            `torn-chat-${sanitizeFilename(selectedChatName)}.csv`,
            csv,
            'text/csv;charset=utf-8'
        );
    }

    function exportJSON() {
        const data = {
            version: '1.9',

            chat:
                selectedChatName,

            chatId:
                selectedChatId,

            chatType:
                selectedChatType,

            exportedAt:
                new Date().toISOString(),

            messageCount:
                archive.size,

            messages:
                getOrderedRecords()
        };

        download(
            `torn-chat-${sanitizeFilename(selectedChatName)}.json`,

            JSON.stringify(
                data,
                null,
                2
            ),

            'application/json;charset=utf-8'
        );
    }

    function download(
        filename,
        content,
        type
    ) {
        const blob =
            new Blob(
                [content],
                { type }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        const a =
            document.createElement(
                'a'
            );

        a.href = url;
        a.download = filename;

        document.body.appendChild(a);

        a.click();
        a.remove();

        setTimeout(
            () =>
                URL.revokeObjectURL(
                    url
                ),
            30000
        );
    }

    /* =========================================================
       CLEAR
       ========================================================= */

    async function clearCurrentSession() {
        if (captureActive) {
            setStatus(
                'Stop Capture before clearing the session'
            );

            return;
        }

        if (!archive.size) {
            setStatus(
                'Archive is already empty'
            );

            return;
        }

        const clear =
            await showYesNoPrompt(
                'Clear Session?',
                'Delete all currently captured messages from this session?'
            );

        if (!clear) {
            setStatus(
                'Clear cancelled'
            );

            return;
        }

        archive = new Map();
        messageOrder = [];
        privateIdCounter = 0;
        rememberedOldestGroup = '';

        setStatus(
            'Session archive cleared'
        );
    }

    /* =========================================================
       STATUS
       ========================================================= */

    function getStats() {
        let exact = 0;
        let grouped = 0;

        for (
            const record of
            archive.values()
        ) {
            if (record.exactTimestamp) {
                exact++;
            }

            if (record.groupTimestamp) {
                grouped++;
            }
        }

        return {
            exact,
            grouped
        };
    }

    function setStateButton(
        id,
        on,
        onText,
        offText
    ) {
        const button =
            document.getElementById(id);

        if (!button) return;

        button.textContent =
            `● ${on ? onText : offText}`;

        button.style.background =
            on
                ? '#176b2c'
                : '#6e2020';

        button.style.border =
            on
                ? '2px solid #45c968'
                : '2px solid #d85a5a';

        button.style.color =
            '#fff';

        button.style.fontWeight =
            '700';

        button.style.fontSize =
            '12px';

        button.style.height =
            '34px';

        button.style.cursor =
            'pointer';

        button.style.textShadow =
            '0 1px 2px #000';
    }

    function updatePlayBar() {
        const bar = document.getElementById('tca-playbar');
        if (!bar) return;
        const copied = document.getElementById('tca-bar-copied');
        if (copied) copied.textContent = 'Copied: ' + archive.size.toLocaleString();
        bar.style.display = captureActive ? 'flex' : 'none';
        const state = {
            play: captureActive && autoRunning && !autoPaused && !completionPromptOpen,
            pause: captureActive && (!autoRunning || autoPaused || completionPromptOpen),
            stop: !captureActive
        };
        for (const [key, active] of Object.entries(state)) {
            const btn = document.getElementById('tca-bar-' + key);
            if (!btn) continue;
            btn.style.background = active ? '#187b38' : '#922b2b';
            btn.style.color = '#fff';
            btn.setAttribute('aria-pressed', String(active));
        }
    }

    function showFullPanel() {
        const panel = document.getElementById('tca-panel');
        const launcher = document.getElementById('tca-launcher');
        if (!panel || !launcher) return;
        panel.style.display = 'block';
        launcher.style.display = 'none';
    }

    function hideFullPanel() {
        const panel = document.getElementById('tca-panel');
        const launcher = document.getElementById('tca-launcher');
        if (!panel || !launcher) return;
        panel.style.display = 'none';
        launcher.style.display = 'block';
        updatePlayBar();
    }

    function pausePlayBar() {
        if (!captureActive) return;
        autoPaused = true;
        stopAutoRun(false);
        setStatus('Paused — capture remains active');
        updateIndicators();
    }

    function resumePlayBar() {
        if (!captureActive) {
            startCapture();
        }
        if (!captureActive) return;
        autoEnabled = true;
        autoPaused = false;
        archiveComplete = false;
        completionPromptOpen = false;
        lastHistoricalProgressAt = performance.now();
        startAutoRun();
        updateIndicators();
    }

    function stopPlayBar() {
        stopCapture('Stopped — archive available for export');
        autoEnabled = false;
        autoPaused = false;
        updateIndicators();
        showFullPanel();
    }

    function updateIndicators() {
        setStateButton(
            'tca-capture-state',
            captureActive,
            'CAPTURE ON',
            'CAPTURE OFF'
        );

        setStateButton(
            'tca-auto-state',
            autoEnabled,
            'AUTO ON',
            'AUTO OFF'
        );
        updatePlayBar();
    }

    function getAutoStatus() {
        if (archiveComplete) {
            return 'COMPLETE';
        }

        if (!autoEnabled) {
            return 'OFF';
        }

        if (
            completionPromptOpen ||
            autoPaused
        ) {
            return 'PAUSED';
        }

        if (
            autoRunning &&
            performance.now() <
                autoYieldUntil
        ) {
            return 'YIELDING';
        }

        if (autoRunning) {
            return 'RUNNING';
        }

        return 'ARMED';
    }

    function getLastHistoricalText() {
        if (!lastHistoricalProgressAt) {
            return '-';
        }

        const age =
            Math.max(
                0,
                (
                    performance.now() -
                    lastHistoricalProgressAt
                ) / 1000
            );

        return (
            age.toFixed(1) +
            ' sec ago'
        );
    }

    function setStatus(note) {
        if (note) {
            currentStatusNote =
                note;
        }

        updateStatus();
    }

    function updateStatus() {
        const status =
            document.getElementById(
                'tca-status'
            );

        if (!status) return;

        const stats =
            getStats();
        updatePlayBar();

        status.innerHTML = `
            <div style="
                white-space:nowrap;
                overflow:hidden;
                text-overflow:ellipsis;
                font-weight:bold;
                margin-bottom:5px;
            ">
                ${escapeHTML(
                    selectedChatName ||
                    'No chat selected'
                )}
            </div>

            <div>
                Type:
                <b>${escapeHTML(
                    selectedChatType || '-'
                )}</b>
            </div>

            <div>
                Messages:
                <b>${archive.size}</b>
            </div>

            <div>
                Group timestamps:
                <b>${stats.grouped}</b>
            </div>

            <div>
                Exact timestamps:
                <b>${stats.exact}</b>
            </div>

            <div>
                Capture:
                <b>${
                    captureActive
                        ? 'ON'
                        : 'OFF'
                }</b>
            </div>

            <div>
                Auto:
                <b>${getAutoStatus()}</b>
            </div>

            <div>
                Last older history:
                <b>${getLastHistoricalText()}</b>
            </div>

            <div style="
                min-height:32px;
                white-space:normal;
                color:#ddd;
                margin-top:6px;
                padding-top:5px;
                border-top:1px solid #444;
                line-height:14px;
            ">
                Status:
                <b>${escapeHTML(
                    currentStatusNote
                )}</b>
            </div>
        `;

        updateIndicators();
    }

    /* =========================================================
       PANEL POSITION
       ========================================================= */

    function savePanelPosition(panel) {
        const rect =
            panel.getBoundingClientRect();

        localStorage.setItem(
            PANEL_POS_KEY,

            JSON.stringify({
                left: rect.left,
                top: rect.top
            })
        );
    }

    function loadPanelPosition(panel) {
        try {
            const raw =
                localStorage.getItem(
                    PANEL_POS_KEY
                );

            if (!raw) return;

            const pos =
                JSON.parse(raw);

            panel.style.left =
                Math.max(
                    0,
                    Math.min(
                        pos.left,
                        window.innerWidth - Math.min(290, window.innerWidth - 16)
                    )
                ) + 'px';

            panel.style.top =
                Math.max(
                    0,
                    Math.min(
                        pos.top,
                        window.innerHeight - 50
                    )
                ) + 'px';

            panel.style.right =
                'auto';

            panel.style.bottom =
                'auto';

        } catch {}
    }

    function makeDraggable(panel, handle) {
        let activePointer = null;
        let dx = 0, dy = 0;
        handle.addEventListener('pointerdown', event => {
            if (event.target.closest('button,select,input')) return;
            activePointer = event.pointerId;
            const rect = panel.getBoundingClientRect();
            dx = event.clientX - rect.left;
            dy = event.clientY - rect.top;
            panel.style.left = rect.left + 'px';
            panel.style.top = rect.top + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            handle.setPointerCapture?.(event.pointerId);
            event.preventDefault();
        });
        handle.addEventListener('pointermove', event => {
            if (event.pointerId !== activePointer) return;
            const maxLeft = Math.max(0, window.innerWidth - panel.offsetWidth);
            const maxTop = Math.max(0, window.innerHeight - 40);
            panel.style.left = Math.max(0, Math.min(maxLeft, event.clientX - dx)) + 'px';
            panel.style.top = Math.max(0, Math.min(maxTop, event.clientY - dy)) + 'px';
        });
        function finish(event) {
            if (event.pointerId !== activePointer) return;
            activePointer = null;
            savePanelPosition(panel);
        }
        handle.addEventListener('pointerup', finish);
        handle.addEventListener('pointercancel', finish);
    }

    function setMinimized(minimized) {
        const body =
            document.getElementById(
                'tca-body'
            );

        const button =
            document.getElementById(
                'tca-minimize'
            );

        if (
            !body ||
            !button
        ) {
            return;
        }

        body.style.display =
            minimized
                ? 'none'
                : 'block';

        button.textContent =
            minimized
                ? '+'
                : '−';

        localStorage.setItem(
            PANEL_MIN_KEY,
            minimized
                ? '1'
                : '0'
        );
        if (minimized) hideFullPanel();
    }

    /* =========================================================
       PANEL
       ========================================================= */

    function createPanel() {
        if (
            document.getElementById(
                'tca-panel'
            )
        ) {
            return;
        }

        const panel =
            document.createElement(
                'div'
            );

        panel.id =
            'tca-panel';

        Object.assign(
            panel.style,
            {
                position: 'fixed',
                right: '10px',
                bottom: '10px',

                zIndex: '999999',

                width: 'min(290px, calc(100vw - 16px))',
                minWidth: '0',
                maxWidth: 'calc(100vw - 16px)',

                background: '#202020',
                color: '#eee',

                border: '1px solid #666',
                borderRadius: '7px',

                boxShadow:
                    '0 3px 12px rgba(0,0,0,.5)',

                fontFamily:
                    'Arial,sans-serif',

                fontSize: '12px',

                overflow: 'hidden',
                maxHeight: 'calc(100dvh - 24px)',
                overflowY: 'auto',
                touchAction: 'pan-y',

                boxSizing:
                    'border-box'
            }
        );

        panel.innerHTML = `
            <div
                id="tca-header"
                style="
                    height:36px;
                    box-sizing:border-box;
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    padding:7px 8px;
                    background:#292929;
                    cursor:move;
                    touch-action:none;
                    font-weight:bold;
                    border-bottom:1px solid #555;
                "
            >
                <span>
                    Torn Chat Archive PDA 0.1
                </span>

                <button
                    id="tca-minimize"
                    style="
                        width:25px;
                        height:22px;
                        padding:0;
                        cursor:pointer;
                        font-weight:bold;
                        color:#fff;
                        background:#444;
                        border:1px solid #777;
                    "
                >
                    −
                </button>
            </div>

            <div
                id="tca-body"
                style="
                    padding:9px;
                    box-sizing:border-box;
                "
            >
                <div style="
                    font-weight:bold;
                    margin-bottom:4px;
                ">
                    Chat to Archive
                </div>

                <div style="
                    display:flex;
                    gap:4px;
                    height:28px;
                    margin-bottom:8px;
                ">
                    <select
                        id="tca-chat-select"
                        style="
                            flex:1;
                            min-width:0;
                            height:28px;
                        "
                    ></select>

                    <button
                        id="tca-refresh"
                        style="
                            width:32px;
                            height:28px;
                            color:#fff;
                            background:#444;
                            border:1px solid #888;
                            font-size:17px;
                            font-weight:bold;
                            cursor:pointer;
                        "
                    >
                        ↻
                    </button>
                </div>

                <div style="
                    display:grid;
                    grid-template-columns:1fr 1fr;
                    gap:5px;
                    height:34px;
                    margin-bottom:7px;
                ">
                    <button
                        id="tca-capture-state"
                    >
                        ● CAPTURE OFF
                    </button>

                    <button
                        id="tca-auto-state"
                    >
                        ● AUTO OFF
                    </button>
                </div>

                <div
                    id="tca-status"
                    style="
                        height:185px;
                        min-height:185px;
                        max-height:185px;
                        box-sizing:border-box;
                        overflow:hidden;
                        padding:8px;
                        background:#181818;
                        border:1px solid #444;
                        border-radius:4px;
                        line-height:15px;
                        margin-bottom:8px;
                    "
                ></div>

                <div style="
                    font-weight:bold;
                    margin-bottom:5px;
                ">
                    Auto Scroll
                </div>

                <div style="
                    display:flex;
                    align-items:center;
                    justify-content:flex-start;
                    gap:3px;
                    margin-bottom:9px;
                ">
                    <span>Step</span>

                    <input
                        id="tca-step"
                        type="number"
                        min="1"
                        max="50"
                        value="${scrollStep}"
                        style="
                            width:44px;
                            box-sizing:border-box;
                            margin-left:1px;
                            margin-right:8px;
                        "
                    >

                    <span>Delay</span>

                    <input
                        id="tca-delay"
                        type="number"
                        min="15"
                        max="500"
                        value="${scrollDelay}"
                        style="
                            width:50px;
                            box-sizing:border-box;
                            margin-left:1px;
                        "
                    >
                </div>

                <div style="
                    display:grid;
                    grid-template-columns:1fr 1fr 1fr;
                    gap:5px;
                ">
                    <button id="tca-csv">
                        CSV
                    </button>

                    <button id="tca-json">
                        JSON
                    </button>

                    <button id="tca-clear">
                        CLEAR
                    </button>
                </div>
            </div>

            <div
                id="tca-prompt-overlay"
                style="
                    display:none;
                    position:absolute;
                    left:0;
                    top:36px;
                    right:0;
                    bottom:0;
                    background:rgba(0,0,0,.90);
                    z-index:100;
                    align-items:center;
                    justify-content:center;
                    padding:14px;
                    box-sizing:border-box;
                "
            >
                <div
                    style="
                        width:100%;
                        background:#242424;
                        border:1px solid #777;
                        border-radius:6px;
                        padding:14px;
                        box-sizing:border-box;
                        box-shadow:0 4px 14px rgba(0,0,0,.7);
                    "
                >
                    <div
                        id="tca-prompt-title"
                        style="
                            font-size:14px;
                            font-weight:bold;
                            margin-bottom:10px;
                            text-align:center;
                        "
                    >
                        History Check
                    </div>

                    <div
                        id="tca-prompt-question"
                        style="
                            font-size:12px;
                            line-height:17px;
                            text-align:center;
                            margin-bottom:14px;
                        "
                    ></div>

                    <div
                        style="
                            display:grid;
                            grid-template-columns:1fr 1fr;
                            gap:8px;
                        "
                    >
                        <button
                            id="tca-prompt-yes"
                            style="
                                height:36px;
                                background:#176b2c;
                                color:#fff;
                                border:2px solid #45c968;
                                border-radius:4px;
                                font-weight:bold;
                                cursor:pointer;
                            "
                        >
                            YES
                        </button>

                        <button
                            id="tca-prompt-no"
                            style="
                                height:36px;
                                background:#6e2020;
                                color:#fff;
                                border:2px solid #d85a5a;
                                border-radius:4px;
                                font-weight:bold;
                                cursor:pointer;
                            "
                        >
                            NO
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        const styleButton =
            (
                button,
                danger = false
            ) => {
                Object.assign(
                    button.style,
                    {
                        background:
                            danger
                                ? '#682424'
                                : '#3f3f3f',

                        color: '#fff',

                        border:
                            danger
                                ? '2px solid #d85a5a'
                                : '2px solid #888',

                        borderRadius: '4px',
                        fontWeight: '700',
                        height: '34px',
                        cursor: 'pointer'
                    }
                );
            };

        document.getElementById(
            'tca-capture-state'
        ).onclick =
            () =>
                captureActive
                    ? stopCapture()
                    : startCapture();

        document.getElementById(
            'tca-auto-state'
        ).onclick =
            toggleAutoSetting;

        document.getElementById(
            'tca-refresh'
        ).onclick =
            () =>
                refreshChatSelector(true);

        document.getElementById(
            'tca-chat-select'
        ).onchange =
            event =>
                switchChat(
                    event.target.value
                );

        document.getElementById(
            'tca-step'
        ).onchange =
            updateScrollSettings;

        document.getElementById(
            'tca-delay'
        ).onchange =
            updateScrollSettings;

        const csv =
            document.getElementById(
                'tca-csv'
            );

        const json =
            document.getElementById(
                'tca-json'
            );

        const clear =
            document.getElementById(
                'tca-clear'
            );

        styleButton(csv);
        styleButton(json);
        styleButton(clear, true);

        csv.onclick =
            exportCSV;

        json.onclick =
            exportJSON;

        clear.onclick =
            clearCurrentSession;

        document.getElementById(
            'tca-minimize'
        ).onclick =
            event => {
                event.stopPropagation();

                const body =
                    document.getElementById(
                        'tca-body'
                    );

                setMinimized(
                    body.style.display !==
                        'none'
                );
            };

        makeDraggable(
            panel,
            document.getElementById(
                'tca-header'
            )
        );

        // Separate movable compact launcher and transport bar.
        const launcher = document.createElement('div');
        launcher.id = 'tca-launcher';
        launcher.textContent = '^';
        launcher.title = 'Open chat archiver';
        launcher.style.cssText = 'position:fixed;right:10px;bottom:10px;z-index:1000001;width:23px;height:23px;line-height:21px;text-align:center;background:#202020;color:#fff;border:1px solid #888;border-radius:5px;font:bold 17px Arial;touch-action:none;user-select:none;cursor:move;';
        document.body.appendChild(launcher);
        let launcherStart = null;
        launcher.addEventListener('pointerdown', e => {
            launcherStart = { x:e.clientX, y:e.clientY, left:launcher.getBoundingClientRect().left, top:launcher.getBoundingClientRect().top, moved:false, id:e.pointerId };
            launcher.setPointerCapture(e.pointerId);
        });
        launcher.addEventListener('pointermove', e => {
            if (!launcherStart || launcherStart.id !== e.pointerId) return;
            const dx=e.clientX-launcherStart.x, dy=e.clientY-launcherStart.y;
            if (Math.abs(dx)+Math.abs(dy)>6) launcherStart.moved=true;
            if (!launcherStart.moved) return;
            launcher.style.right='auto'; launcher.style.bottom='auto';
            launcher.style.left=Math.max(0,Math.min(innerWidth-23,launcherStart.left+dx))+'px';
            launcher.style.top=Math.max(0,Math.min(innerHeight-23,launcherStart.top+dy))+'px';
        });
        launcher.addEventListener('pointerup', e => {
            if (!launcherStart || launcherStart.id !== e.pointerId) return;
            const moved=launcherStart.moved;
            launcherStart=null;
            if (!moved) showFullPanel();
        });
        const bar = document.createElement('div');
        bar.id = 'tca-playbar';
        bar.style.cssText = 'position:fixed;right:10px;bottom:44px;z-index:1000000;display:none;align-items:center;gap:4px;padding:5px;background:#202020;border:1px solid #777;border-radius:6px;touch-action:none;user-select:none;';
        bar.innerHTML = '<span id="tca-bar-handle" style="padding:4px 6px;color:#ccc;cursor:move;touch-action:none">⋮⋮</span>' +
          ['play','pause','stop'].map(k => '<button id="tca-bar-'+k+'" style="border:1px solid #ccc;border-radius:4px;padding:7px 9px;font:bold 12px Arial;color:white">'+k.toUpperCase()+'</button>').join('') +
          '<span id="tca-bar-copied" style="color:#fff;font:bold 12px Arial;white-space:nowrap;padding:0 4px">Copied: 0</span>';
        document.body.appendChild(bar);
        makeDraggable(bar, document.getElementById('tca-bar-handle'));
        document.getElementById('tca-bar-play').onclick = resumePlayBar;
        document.getElementById('tca-bar-pause').onclick = pausePlayBar;
        document.getElementById('tca-bar-stop').onclick = stopPlayBar;

        loadPanelPosition(panel);

        refreshChatSelector(false);

        setMinimized(false);
        hideFullPanel();
        updateIndicators();
        updateStatus();
    }

    /* =========================================================
       INITIALIZATION
       ========================================================= */

    loadSettings();

    function mountWhenReady() {
        if (!document.body) {
            setTimeout(mountWhenReady, 250);
            return;
        }
        createPanel();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(mountWhenReady, 1000), { once: true });
    } else {
        setTimeout(mountWhenReady, 1000);
    }

})();