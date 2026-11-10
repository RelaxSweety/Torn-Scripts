import { RollingBudget } from './registration-budget.js';
export class SubmissionBudget extends RollingBudget {
  constructor(state) { super(state, {window:60_000, global:500, key:60, ip:120}); }
}
