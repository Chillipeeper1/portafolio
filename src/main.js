import { createRobot } from './robot.js';
import { initI18n } from './i18n.js';

initI18n();
createRobot(document.getElementById('robot'));
