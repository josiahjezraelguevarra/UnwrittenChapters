export interface DonateQrOption {
  id: string;
  label: string;
  imagePath: string;
  hint?: string;
}

/**
 * Single straightforward Maya donation QR configuration.
 */
export const DONATE_QR_OPTIONS: DonateQrOption[] = [
  {
    id: 'maya',
    label: 'Maya',
    imagePath: '/qr/maya.png',
    hint: 'Scan with your Maya app'
  }
];
