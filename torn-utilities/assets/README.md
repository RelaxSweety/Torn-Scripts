# Approved TU logo and branding master

`tu-logo-integrated-gold.png` is the user-approved Integrated Gold master with flare highlights removed. Preserve its artwork and original bytes. Do not regenerate, recolor, upscale, add highlights or replace it without an explicit artwork request.

The approved performance change derives two lossless WebP assets by Lanczos downsampling that master: `tu-logo-128.webp` (17,234 bytes) for small launcher/header/War Organizer branding, and `tu-logo-256.webp` (56,424 bytes) for larger or high-density uses. These preserve the approved design, proportions and transparency. They are committed once; normal builds do not convert images. The integrated DEV build embeds the 128px image once as a shared CSS image. About links the original master for an explicit full-resolution preview; startup does not download it.

For an explicitly authorized asset rebuild, run `bash torn-utilities/all-in-one/scripts/build-logo-assets.sh` with ImageMagick/WebP installed. Review the output and sizes because encoder versions may differ. Never overwrite the master. Historical assets and immutable releases remain unchanged.

[Approved master](https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/dev/tu-all-in-one/torn-utilities/assets/tu-logo-integrated-gold.png)
