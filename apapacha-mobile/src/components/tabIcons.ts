import type { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// Íconos de la navegación principal, compartidos por la barra inferior (móvil)
// y el menú lateral (escritorio) para que el vocabulario sea el mismo.
export const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  Home:          { active: 'home',           inactive: 'home-outline'           },
  Explore:       { active: 'compass',        inactive: 'compass-outline'        },
  Inbox:         { active: 'chatbubbles',    inactive: 'chatbubbles-outline'    },
  Bookings:      { active: 'calendar',       inactive: 'calendar-outline'       },
  HostDashboard: { active: 'paw',            inactive: 'paw-outline'            },
  Profile:       { active: 'person-circle',  inactive: 'person-circle-outline'  },
};
