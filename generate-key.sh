#!/bin/bash

# Takes one argument and generates the following for
# use with Preprod Testnet (--testnet-magic 1)
#
# 1- Verification key
# 2- Signing key
# 3- Address (preprod testnet)

if [[ ! $# -gt 0 ]]; then
  echo "Missing wallet name as argument" && exit 1
fi

keyName=$1
foldername="wallet"


cardano-cli address key-gen \
  --verification-key-file $foldername/$keyName.vkey \
  --signing-key-file $foldername/$keyName.skey

cardano-cli address build \
  --payment-verification-key-file $foldername/$keyName.vkey \
  --out-file $foldername/$keyName.addr --testnet-magic 1

echo "Generated files in $foldername folder:"
ls -l $foldername | grep -i $keyName