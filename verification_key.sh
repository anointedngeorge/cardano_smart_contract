
source_addr=addr_test1qpc203qz2g9efx3l308e534k8v8j8tuy5vvy2kl4ffujmjk57ehyuallpnhw857essng26nm9832hggztktv9nldg2xsxcas7g
network="--testnet-magic 1"

cardano-cli address build \
  --payment-verification-key-file $source_addr \
  --out-file payment.addr \
  --testnet-magic 1