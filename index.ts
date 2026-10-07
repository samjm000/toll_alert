import { registerRootComponent } from 'expo';

// First, so its background task is defined (and the process-start line
// logged) in every JS context — including headless relaunches where the OS
// starts the app only to run a background task.
import './src/diagnostics/heartbeat';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
