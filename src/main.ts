import { createApp } from 'vue'
import 'element-plus/dist/index.css';
import './style.css'
import App from './App.vue'

import router from './router/router';

createApp(App)
  .use(router)
  .mount('#app')
