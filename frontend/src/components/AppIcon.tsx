import type { HTMLAttributes } from 'react';

export type AppIconName =
  | 'brand'
  | 'dashboard'
  | 'accounts'
  | 'users'
  | 'settings'
  | 'logout'
  | 'system'
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
  | 'article';

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
};

export function AppIcon({ name, className, ...props }: Readonly<AppIconProps>) {
  return (
    <span aria-hidden="true" className={`app-icon material-symbols-rounded ${className ?? ''}`.trim()} {...props}>
      {iconNames[name]}
    </span>
  );
}
