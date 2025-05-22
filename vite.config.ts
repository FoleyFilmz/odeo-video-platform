
import { defineConfig } from 'vite';
import cartographer from '@replit/vite-plugin-cartographer';

export default defineConfig({
  plugins: [cartographer()],
});
