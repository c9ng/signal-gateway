import { DataType, Model, Table, Column, BelongsTo, ForeignKey, AllowNull, Default } from 'sequelize-typescript';
import OauthClient from './OauthClient';

@Table
export default class OauthAuthorizationCode extends Model {
    @AllowNull(false)
    @Column(DataType.TEXT)
    authorizationCode!: string;

    @AllowNull(false)
    @Column(DataType.DATE)
    expiresAt!: Date;

    @AllowNull(false)
    @Default('urn:ietf:wg:oauth:2.0:oob')
    @Column(DataType.TEXT)
    redirectUri!: string;

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
    // userId!: number;

    // @BelongsTo(() => User)
    // user!: User;
}
