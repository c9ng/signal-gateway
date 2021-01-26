#!/bin/bash

echo " ---> Running Migrations"
npx sequelize db:migrate

echo " ---> Starting Server"
exec node dist/index.js
