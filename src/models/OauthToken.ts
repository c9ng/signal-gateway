import { DataType, Model, Table, Column, BelongsTo, ForeignKey, AllowNull, Default } from 'sequelize-typescript';
import OauthClient from './OauthClient';
import { NODE_ENV } from '../config/env';
import * as db from '../config/db';

const DIALECT = db[NODE_ENV].dialect;

@Table
export default class OauthToken extends Model {
    @AllowNull(false)
    @Column(DataType.TEXT)
    accessToken!: string;

    @AllowNull
    @Column(DataType.DATE)
    accessTokenExpiresAt!: Date|null;

    @AllowNull
    @Column(DataType.TEXT)
    refreshToken!: string|null;

    @AllowNull
    @Column(DataType.DATE)
    refreshTokenExpiresAt!: Date|null;

    @AllowNull(false)
    @Default([])
    @Column(DIALECT === 'postgres' ? DataType.ARRAY(DataType.TEXT) : DataType.JSON)
    scope!: string[];

    @AllowNull(false)
    @ForeignKey(() => OauthClient)
    @Column(DataType.UUID)
    clientId!: string;

    @BelongsTo(() => OauthClient)
    client!: OauthClient;

    // We don't have any users (for now?).
    // @ForeignKey(() => User)
    // @Column(DataType.INTEGER)
    // userId!: number;

    // @BelongsTo(() => User)
    // user!: User;
}
