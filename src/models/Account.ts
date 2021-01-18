import { DataType, Model, Table, Column, AllowNull, ForeignKey, BelongsTo, PrimaryKey } from 'sequelize-typescript';
import OauthClient from './OauthClient';
import { NODE_ENV } from '../config/env';
import * as db from '../config/db';
import { EventType } from '@throneless/libsignal-service';

const DIALECT = db[NODE_ENV].dialect;

@Table
export default class Account extends Model {
    @PrimaryKey
    @AllowNull(false)
    @ForeignKey(() => OauthClient)
    @Column(DataType.UUID)
    clientId!: string;

    @BelongsTo(() => OauthClient)
    client!: OauthClient;

    @PrimaryKey
    @AllowNull(false)
    @Column(DataType.TEXT)
    tel!: string;

    @AllowNull(false)
    @Column(DataType.TEXT)
    name!: string;

    @AllowNull(false)
    @Column(DIALECT === 'postgres' ? DataType.ARRAY(DataType.TEXT) : DataType.JSON)
    events!: EventType[];
}
