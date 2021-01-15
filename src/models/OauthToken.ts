import { DataType, Model, Table, Column, BelongsTo, ForeignKey, AllowNull, Default } from 'sequelize-typescript';
import OauthClient from './OauthClient';

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

    // maybe array? node-oauth2-server wants a string everywhere
    @AllowNull(false)
    @Default([])
    @Column(DataType.ARRAY(DataType.TEXT))
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
