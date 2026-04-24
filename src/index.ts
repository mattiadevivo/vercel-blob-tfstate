import { Config } from './config/config.js';
import { HttpApp } from './http/index.js';

function main() {
    const config = new Config();
    const httpApp = new HttpApp(config.env.http);
    httpApp.run();
}
