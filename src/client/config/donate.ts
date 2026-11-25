export interface DonateQrOption {
  id: string;
  label: string;
  imagePath: string;
  hint?: string;
}

/**
 * Drop QR images into `public/qr/` (e.g. `public/qr/gcash.png`, `public/qr/maya.png`)
 * and list them here. Any image that hasn't been uploaded yet is hidden automatically.
 */
export const DONATE_QR_OPTIONS: DonateQrOption[] = [
  {
    id: 'gcash',
    label: 'GCash',
    imagePath: '/qr/gcash.png',
    hint: 'Scan with GCash app'
  },
  {
    id: 'maya',
    label: 'Maya',
    imagePath: '/qr/maya.png',
    hint: 'Scan with Maya app'
  },
  {
    id: 'kofi',
    label: 'Ko-fi / PayPal',
    imagePath: '/qr/kofi.png',
    hint: 'Scan to support hosting'
  }
];
