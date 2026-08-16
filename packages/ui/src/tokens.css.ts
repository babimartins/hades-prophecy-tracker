import { css } from 'lit'

/** Shared surface styles. A consumer overrides the custom properties. */
export const surface = css`
  :host {
    --hd-color-text: #f3ead9;
    --hd-color-muted: #a29684;
    --hd-color-surface: #1b1420;
    --hd-color-accent: #c8102e;
    --hd-color-done: #2f9e6f;
    --hd-radius: 8px;
    --hd-gap: 12px;
    color: var(--hd-color-text);
    font-family: system-ui, sans-serif;
  }
`
