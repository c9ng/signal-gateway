#!/bin/bash

set -e

SELF=$(readlink -f "$0")
DIR=$(dirname "$SELF")

if [[ -e "$DIR/.credentials" ]]; then
	. "$DIR/.credentials"
fi

if [[ -z "$CLIENT_ID" ]]; then
	echo "missing environment variable CLIENT_ID">&2
	exit 1
fi

if [[ -z "$CLIENT_SECRET" ]]; then
	echo "missing environment variable CLIENT_SECRET">&2
	exit 1
fi

ORIGIN=${ORIGIN:-http://localhost:8080}
SCOPE=${SCOPE:-read:accounts,write:accounts,read:messages,write:messages,read:attachments}

ACCESS_TOKEN=$(curl -X POST --silent "$ORIGIN/oauth/token" \
    -d "client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&grant_type=client_credentials&scope=$SCOPE" \
    -H "Content-Type: application/x-www-form-urlencoded" | jq -r .accessToken)

path=$1
shift

exec curl --silent -H "Authorization: Bearer $ACCESS_TOKEN" "$ORIGIN$path" "$@"
