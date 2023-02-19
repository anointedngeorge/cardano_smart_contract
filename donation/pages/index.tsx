
import BuyProduct from '../components/BuyProduct';
import Head from 'next/head'
import type { NextPage } from 'next'
import styles from '../styles/Home.module.css'
import { useState, useEffect } from "react";
import WalletInfo from '../components/WalletInfo';
import {
  Address,
  ByteArrayData,
  Cip30Handle,
  Cip30Wallet,
  Datum,
  IntData,
  NetworkParams,
  ListData,
  Program,
  Value,
  TxOutput,
  Tx,
  WalletHelper} from "@hyperionbt/helios";

import path from 'path';
import { promises as fs } from 'fs';

declare global {
  interface Window {
      cardano:any;
  }
}

export async function getServerSideProps(context : any) {

  const orderId = (parseInt(context.query.id) || 0).toString();
  const shop = process.env.NEXT_PUBLIC_SHOP as string;
  const token = process.env.NEXT_PUBLIC_ACCESS_TOKEN as string;
  const serviceFee = process.env.NEXT_PUBLIC_SERVICE_FEE as string;
  const serviceFeeAda = parseInt(serviceFee) / 1000000   // in Ada
  const uri = "admin/api/2022-10/orders/";
  const url = shop + uri + orderId + ".json";

  try {

    const contractDirectory = path.join(process.cwd(), 'contracts/');
    const fileContents = await fs.readFile(contractDirectory + 'donation.hl', 'utf8');
    const contractScript = fileContents.toString();

    const req = await fetch(url,{

      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
      method: 'GET'
    });

    const orderData = await req.json();

    const adaUrl = "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=ADA&convert=USD";
    const adaReq = await fetch(adaUrl, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-CMC_PRO_API_KEY': process.env.NEXT_PUBLIC_COIN_API_KEY as string,
        'Content-Type': 'application/json',
      },
      method: 'GET'
    });

    const adaData = await adaReq.json();
    const adaPrice : number = adaData.data.ADA[0].quote.USD.price;

    if (!orderData.errors) {
      const adaAmount = (orderData.order.total_price / adaPrice) + serviceFeeAda;
      const orderInfo = {
        order_id : orderData.order.id as string,
        total : orderData.order.total_price,
        ada_amount : adaAmount.toFixed(2),
        shop : shop,
        access_token : token,
        ada_usd_price : adaPrice.toFixed(5),
        tx_id : "",
        script: contractScript
      }
      return { props: orderInfo };

    } else {
      const orderInfo = {
        order_id : "0",
        total : 0,
        ada_amount : 0,
        script: contractScript
      }
      return { props: orderInfo };
    }
  } catch (err) {
    console.log('getServerSideProps', err);
  }
  return { props: undefined };
}


const Home: NextPage = (props : any) => {

  const optimize = false;
  const networkParamsUrl = process.env.NEXT_PUBLIC_NETWORK_PARAMS_URL as string;
  const serviceFee = process.env.NEXT_PUBLIC_SERVICE_FEE as string;
  const orderAPIKey = process.env.NEXT_PUBLIC_ORDER_API_KEY as string;

  const [walletAPI, setWalletAPI] = useState<undefined | any>(undefined);
  const [tx, setTx] = useState({ txId : '' });
  const [orderInfo, setId] = useState<undefined | any>(props);
  const [walletInfo, setWalletInfo] = useState({ balance : ''});
  const [walletIsEnabled, setWalletIsEnabled] = useState(false);
  const [whichWalletSelected, setWhichWalletSelected] = useState(undefined);

  useEffect(() => {
    const checkWallet = async () => {

      setWalletIsEnabled(await checkIfWalletFound());
    }
    checkWallet();
  }, [whichWalletSelected]);

  useEffect(() => {
    const enableSelectedWallet = async () => {
      if (walletIsEnabled) {
        const api = await enableWallet();
        setWalletAPI(api);
      }
    }
    enableSelectedWallet();
  }, [walletIsEnabled]);

  useEffect(() => {
    const updateWalletInfo = async () => {

        if (walletIsEnabled) {
            const _balance = await getBalance() as string;
            setWalletInfo({
              ...walletInfo,
              balance : _balance
            });
        }
    }
    updateWalletInfo();
  }, [walletAPI]);

  // user selects what wallet to connect to
  const handleWalletSelect = (obj : any) => {
    const whichWalletSelected = obj.target.value
    setWhichWalletSelected(whichWalletSelected);
  }

  const checkIfWalletFound = async () => {

    let walletFound = false;

    const walletChoice = whichWalletSelected;
    if (walletChoice === "nami") {
        walletFound = !!window?.cardano?.nami;
    } else if (walletChoice === "eternl") {
        walletFound = !!window?.cardano?.eternl;
    }
    return walletFound;
  }

  const enableWallet = async () => {

    try {
      const walletChoice = whichWalletSelected;
      if (walletChoice === "nami") {
          const handle: Cip30Handle = await window.cardano.nami.enable();
          const walletAPI = new Cip30Wallet(handle);
          return walletAPI;
        } else if (walletChoice === "eternl") {
          const handle: Cip30Handle = await window.cardano.eternl.enable();
          const walletAPI = new Cip30Wallet(handle);
          return walletAPI;
        }
    } catch (err) {
        console.log('enableWallet error', err);
    }
  }

const getBalance = async () => {
  try {
      const walletHelper = new WalletHelper(walletAPI);
      const balanceAmountValue  = await walletHelper.calcBalance();
      const balanceAmount = balanceAmountValue.lovelace;
      const walletBalance : BigInt = BigInt(balanceAmount);
      return walletBalance.toLocaleString();
    } catch (err) {
        console.log('getBalance error: ', err);
    }
  }

  const buyProduct = async () => {

    const lovelaceAmount : string = ((orderInfo.ada_amount as number) * 1000000).toFixed(0);
    const adaUsdPrice : string = orderInfo.ada_usd_price;
    const orderId : string = orderInfo.order_id;
    const orderAdaVal = new Value(BigInt(lovelaceAmount));

    // Get wallet UTXOs
    const walletHelper = new WalletHelper(walletAPI);
    const utxos = await walletHelper.pickUtxos(orderAdaVal);

    // Get change address
    const changeAddr = await walletHelper.changeAddress;

    // Compile the Helios script
    const compiledScript = Program.new(orderInfo.script).compile(optimize);

    // Extract the validator script address
    const valAddr = Address.fromValidatorHash(compiledScript.validatorHash);

    // Construct the datum
    const datum = new ListData([new IntData(BigInt(lovelaceAmount) - BigInt(serviceFee)),
                                ByteArrayData.fromString(orderId),
                                ByteArrayData.fromString(adaUsdPrice)]);

    const inlineDatum = Datum.inline(datum);


    // Start building the transaction
    const tx = new Tx();

    // Add input UTOXs
    tx.addInputs(utxos[0]);

    // Add the destination address and the amount of Ada to lock including a datum
    tx.addOutput(new TxOutput(valAddr, new Value(BigInt(lovelaceAmount)), inlineDatum));

    const networkParams = new NetworkParams(
      await fetch(networkParamsUrl)
          .then(response => response.json())
    )
    console.log("tx before final", tx.dump());

    // Send any change back to the buyer
    await tx.finalize(networkParams, changeAddr);
    console.log("tx after final", tx.dump());

    console.log("Verifying signature...");
    const signatures = await walletAPI.signTx(tx);
    tx.addSignatures(signatures);

    console.log("Submitting transaction...");
    const txHash = await walletAPI.submitTx(tx);

    console.log("txHash", txHash.hex);
    setTx({ txId: txHash.hex });

    const updateOrderInfo = {
      ...orderInfo,
      tx_id : txHash.hex
    }

    const response = await fetch('/api/updateOrder', {
      method: 'POST',
      body: JSON.stringify({ updateOrderInfo }),
      headers: {
        'Authorization' : 'Basic ' + orderAPIKey,
        'Content-type' : 'application/json',
      },
    })
    const data = await response.json();
    console.log("updateOrder", data);

  }


  return (
    <div className={styles.container}>
      <Head>
        <title>Helios Tx Builder</title>
        <meta name="description" content="Littercoin web tools page" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h3 className={styles.title}>
          Helios Tx Builder
        </h3>

        <div className={styles.borderwallet}>
            <p>
              Connect to your wallet
            </p>
            <p className={styles.borderwallet}>
              <input type="radio" id="nami" name="wallet" value="nami" onChange={handleWalletSelect}/>
                <label>Nami</label>
            </p>
            <p className={styles.borderwallet}>
                <input type="radio" id="eternl" name="wallet" value="eternl" onChange={handleWalletSelect}/>
                <label>Eternl</label>
            </p>
          </div>
          <div className={styles.borderwallet}>
            View Smart Contract:  &nbsp;  &nbsp;
            <a href="/api/donation" target="_blank" rel="noopener noreferrer">donation.hl</a>
          </div>
          {!tx.txId && walletIsEnabled && <div className={styles.border}><WalletInfo walletInfo={walletInfo}/></div>}
          {tx.txId && <div className={styles.border}><b>Transaction Success!!!</b>
          <p>TxId &nbsp;&nbsp;<a href={"https://preprod.cexplorer.io/tx/" + tx.txId} target="_blank" rel="noopener noreferrer" >{tx.txId}</a></p>
          <p>Please wait until the transaction is confirmed on the blockchain and reload this page before doing another transaction</p>
          <p></p>
          </div>}

          {walletIsEnabled && !tx.txId && <div className={styles.border}><BuyProduct onBuyProduct={buyProduct} orderInfo={orderInfo}/></div>}

      </main>

      <footer className={styles.footer}>

      </footer>
    </div>
  )
}

export default Home
