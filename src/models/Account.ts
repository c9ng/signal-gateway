import { DataType, Model, Table, Column, AllowNull, ForeignKey, BelongsTo, PrimaryKey } from 'sequelize-typescript';
import OauthClient from './OauthClient';

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
}
