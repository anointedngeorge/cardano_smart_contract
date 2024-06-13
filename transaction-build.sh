source_addr=addr_test1qpc203qz2g9efx3l308e534k8v8j8tuy5vvy2kl4ffujmjk57ehyuallpnhw857essng26nm9832hggztktv9nldg2xsxcas7g
source_utxo=96f134a0f3f8d9bc491f2f933a56a207679d2e650a3384956f321ee5246f8d96#0
destination_addr=addr_test1qrtdfm5etzgqhxzuz0rmjeqs67ffxk0y40de0y03tqka3kv8ydtdam4lnmq3y2mc33d8npxwkvfdkhmcd7nm7hzcn7sswqc57x

network="--testnet-magic 1"

# cardano-cli transaction build --babbage-era \
#     --cardano-mode $network \
#     --change-address "$source_addr" \
#     --tx-in "$source_utxo" \
#     --tx-out "$destination_addr+2000000" \
#     --protocol-params-file pparms.json \
#     --out-file transfer-tx-alonzo.body

cardano-cli transaction build \
  --testnet-magic 1 \
  --tx-in $source_utxo \
  --tx-out "$destination_addr+1000000" \
  --change-address $source_addr \
  --out-file transfer-tx-alonzo.body
