#!/bin/bash

dbuser="mongres"
dbpassword="mongrespw"
database="mongres_test"

createuser $dbuser
createdb $database
psql postgres -c "alter user $dbuser with encrypted password '$dbpassword'"
psql postgres -c "grant all privileges on database $database to $dbuser"
