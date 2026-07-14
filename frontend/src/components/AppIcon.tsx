import type { HTMLAttributes } from 'react';

export type AppIconName =
  | 'brand'
  | 'dashboard'
  | 'accounts'
  | 'users'
  | 'settings'
  | 'logout'
  | 'system'
  | 'trendingUp'
  | 'trendingDown'
  | 'horizontalRule'
  | 'chevronDown'
  | 'chevronRight'
  | 'statusOnline'
  | 'statusActive'
  | 'statusInactive'
  | 'statusPending'
  | 'edit'
  | 'power'
  | 'play'
  | 'star'
  | 'starOutline'
  | 'admin'
  | 'delete'
  | 'mail'
  | 'phone'
  | 'location'
  | 'check'
  | 'shield'
  | 'article'
  | 'entry'
  | 'simulation'
  | 'menu'
  | 'eye'
  | 'close'
  | 'link';

interface AppIconProps extends HTMLAttributes<HTMLSpanElement> {
  name: AppIconName;
}

const iconNames: Record<AppIconName, string> = {
  brand: 'account_balance_wallet',
  dashboard: 'space_dashboard',
  accounts: 'account_balance',
  users: 'group',
  settings: 'settings',
  logout: 'logout',
  system: 'memory',
  trendingUp: 'trending_up',
  trendingDown: 'trending_down',
  horizontalRule: 'horizontal_rule',
  chevronDown: 'expand_more',
  chevronRight: 'chevron_right',
  statusOnline: 'check_circle',
  statusActive: 'check_circle',
  statusInactive: 'cancel',
  statusPending: 'schedule',
  edit: 'edit',
  power: 'power_settings_new',
  play: 'play_arrow',
  star: 'star',
  starOutline: 'star_outline',
  admin: 'admin_panel_settings',
  delete: 'delete',
  mail: 'mail',
  phone: 'call',
  location: 'location_on',
  check: 'check',
  shield: 'shield',
  article: 'article',
  entry: 'playlist_add_check_circle',
  simulation: 'monitoring',
  menu: 'menu',
  eye: 'visibility',
  close: 'close',
  link: 'open_in_new',
};

export function AppIcon({ name, className, ...props }: Readonly<AppIconProps>) {
  return (
    <span aria-hidden="true" className={`app-icon material-symbols-rounded ${className ?? ''}`.trim()} {...props}>
      {iconNames[name]}
    </span>
  );
}
