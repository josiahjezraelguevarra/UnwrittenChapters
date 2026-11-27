import { Clock, Columns2, LayoutGrid, Maximize, Moon, Rows3, Square, Sun } from 'lucide-react';
import type { GalleryLayout, GalleryTheme } from '../../shared/types';
import type { CustomSelectOption } from '../components/CustomSelect';

export const LAYOUT_SELECT_OPTIONS: CustomSelectOption<GalleryLayout>[] = [
  {
    value: 'masonry',
    label: 'Masonry (Editorial)',
    description: 'Natural photo proportions in columns',
    icon: <LayoutGrid className="h-4 w-4" />
  },
  {
    value: 'justified',
    label: 'Justified Rows',
    description: 'Uniform row heights edge-to-edge',
    icon: <Rows3 className="h-4 w-4" />
  },
  {
    value: 'grid',
    label: 'Square Grid',
    description: 'Symmetrical 1:1 cropped tiles',
    icon: <Square className="h-4 w-4" />
  },
  {
    value: 'large',
    label: 'Large Showcase',
    description: 'Generous 1–2 column feature frames',
    icon: <Maximize className="h-4 w-4" />
  },
  {
    value: 'editorial',
    label: 'Editorial Mix',
    description: 'Magazine hero spans & paired tiles',
    icon: <Columns2 className="h-4 w-4" />
  }
];

export const THEME_SELECT_OPTIONS: CustomSelectOption<GalleryTheme>[] = [
  {
    value: 'light',
    label: 'Clean Light',
    description: 'Warm stone paper & crisp dark ink',
    icon: <Sun className="h-4 w-4" />
  },
  {
    value: 'dark',
    label: 'Gallery Dark',
    description: 'Deep slate canvas for high contrast',
    icon: <Moon className="h-4 w-4" />
  }
];

export const EXPIRY_SELECT_OPTIONS: CustomSelectOption<string>[] = [
  {
    value: '',
    label: 'Never expire',
    description: 'Stays active until you delete it',
    icon: <Clock className="h-4 w-4" />
  },
  {
    value: '7',
    label: '7 days',
    description: 'Auto-expires after 1 week',
    icon: <Clock className="h-4 w-4" />
  },
  {
    value: '30',
    label: '30 days',
    description: 'Auto-expires after 1 month',
    icon: <Clock className="h-4 w-4" />
  },
  {
    value: '90',
    label: '90 days',
    description: 'Auto-expires after 3 months',
    icon: <Clock className="h-4 w-4" />
  }
];

export const REPORT_REASON_OPTIONS: CustomSelectOption<string>[] = [
  {
    value: 'Inappropriate content',
    label: 'Inappropriate or illegal content'
  },
  {
    value: 'Copyright / DMCA',
    label: 'Copyright / DMCA violation'
  },
  {
    value: 'Spam / Abuse',
    label: 'Spam or abusive link'
  }
];
