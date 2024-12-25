# TO USE: export CONNECTION_STRING before running this script. make sure to put a space before the command to avoid saving the connection string in your shell history


ZERO_AUTH_SECRET=$(openssl rand -base64 32)
ZERO_UPSTREAM_DB="${CONNECTION_STRING}/zstart?sslmode=disable"
ZERO_CVR_DB="${CONNECTION_STRING}/zstart_cvr?sslmode=disable"
ZERO_CHANGE_DB="${CONNECTION_STRING}/zstart_cdb?sslmode=disable"

fly secrets set ZERO_AUTH_SECRET="$ZERO_AUTH_SECRET" ZERO_UPSTREAM_DB="$ZERO_UPSTREAM_DB" ZERO_CVR_DB="$ZERO_CVR_DB" ZERO_CHANGE_DB="$ZERO_CHANGE_DB"

echo "$ZERO_AUTH_SECRET"