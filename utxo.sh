#!/bin/bash

source_addr=addr_test1qpc203qz2g9efx3l308e534k8v8j8tuy5vvy2kl4ffujmjk57ehyuallpnhw857essng26nm9832hggztktv9nldg2xsxcas7g
network="--testnet-magic 1"


cardano-cli query utxo --address $source_addr --cardano-mode $network


