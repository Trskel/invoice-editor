import { ThemeConfig } from 'antd'

// The default design tokens fail the WCAG 2.1 AA text contrast ratio of 4.5:1
// on white and on the page background: the placeholder grey, the primary blue
// used by links, primary buttons and the selected filter, the danger red and
// the tertiary grey used by the detail labels all fall short. These overrides
// keep the same palette, one step darker, and pass the browser audit.
export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#0958d9',
    colorLink: '#0958d9',
    colorError: '#cf1322',
    colorTextTertiary: 'rgba(0, 0, 0, 0.65)',
    colorTextPlaceholder: 'rgba(0, 0, 0, 0.55)',
  },
}
