import { DataType, Model, Table, Column, AllowNull, ForeignKey, BelongsTo, PrimaryKey } from 'sequelize-typescript';
import OauthClient from './OauthClient';
import Account from './Account';
import { NODE_ENV } from '../config/env';
import * as db from '../config/db';

@Table
export default class StorageRecord extends Model {
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

//    @BelongsTo(() => Account)
//    account!: Account;

    @PrimaryKey
    @AllowNull(false)
    @Column(DataType.TEXT)
    type!: string;

    @PrimaryKey
    @AllowNull(false)
    @Column(DataType.TEXT)
    id!: string;

    @AllowNull(false)
    @Column(db[NODE_ENV].dialect === 'postgres' ? DataType.JSONB : DataType.JSON)
    data!: object;
}
