import { resolve } from 'path';
import { Sequelize } from 'sequelize-typescript';
import { NODE_ENV } from './env';
import * as db from './db';

export * as env from './env';
export * as db from './db';

export const sequelize = new Sequelize(db[NODE_ENV]);

sequelize.addModels([resolve(__dirname, '..', 'models')]);
