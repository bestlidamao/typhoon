import React, { useState, useEffect } from 'react';
import {
  Toolbar, Button, MenuList, MenuListItem, TextInput, Frame, Select
} from 'react95';
import { WalletUtils } from '../utils/walletUtils'
import Modal from './Modal'
import { chainList, assetList } from '../libs/data.js'
import { useGlobal } from '../context/GlobalContext';

const wallet = new WalletUtils()

function Bar() {
  const { state, actions } = useGlobal();
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [chainId, setChainId] = useState('');
  const [openConnect, setOpenConnect] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [balance, setBalance] = useState(0);
  const [count, setCount] = useState(1);
  const [toAddress, setToAddress] = useState('');
  const [hash, setHash] = useState('');
  const [originChain, setOriginChain] = useState('0x1');
  const [targetChain, setTargetChain] = useState('0xa');
  const [asset, setAsset] = useState('eth');

  const getBalance = async (addr) => {
    const balance = await wallet.getBalance(addr || address)
    setBalance((+balance).toFixed(2))
  }

  const connect = async () => {
    setOpenConnect(true)
    const account = await wallet.connectWallet()
    if (account) {
      try {
        console.log('连接的钱包地址:', account)
        setAddress(account)
        setOpenConnect(false)
        // 获取当前网络
        const chainId = await wallet.getCurrentChainId()
        setOriginChain(chainId)
        setChainId(chainId)
        console.log('当前网络:', chainId)
        // 获取余额
        getBalance(account)
      } catch (error) {
        console.log('error:', error)
        openConnect(false)
      }
    }
  }

  const formatAddress = () => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const onOriginChainChange = (e) => {
    console.log('origin chain:', e)
    setOriginChain(e.value)
  }

  const onTargetChainChange = (e) => {
    console.log('target chain:', e)
    setTargetChain(e.value)
  }

  const onAssetChange = (e) => {
    console.log('asset:', e)
    setAsset(e.value)
  }

  const transaction = async () => {
    console.log('confirm')
    if (!toAddress) {
      alert('Please enter the target address')
      return
    }
    if (!count) {
      alert('Please enter the count')
      return
    }
    if (chainId !== originChain) {
      console.log('switch network', originChain)
      await wallet.switchNetwork(originChain)
      return
    }
    try {
      setOpenConfirm(true)
      const hash = await wallet.sendTransaction(toAddress, count.toString())
      setHash(hash)
      if (!hash) {
        console.log('hash:', hash)
        setOpenConfirm(false)
      }
    } catch (error) {
      console.log('error:', error)
      setOpenConfirm(false)
    }
    // setOpen(false)
  }

  const confirm = async () => {
    // if (!hash) {
    //   alert('Please confirm the transaction first')
    //   return
    // }
    console.log('confirm')
    const data = {
      from: address,
      to: toAddress,
      amount: count,
      asset: asset,
      originChain: originChain,
      targetChain: targetChain
    }
    console.log('data:', data)
    localStorage.setItem('list', JSON.stringify([...state.list, data]))
    actions.setList([...state.list, data])
    setAsset('eth')
    setCount(1)
    setToAddress('')
    setOpenConfirm(false)
    setOpen(false)
  }

  const inputChange = (e) => {
    console.log('input:', e.target.value)
    setToAddress(e.target.value)
  }

  const inputCountChange = (e) => {
    console.log('count:', e.target.value)
    setCount(e.target.value)
  }

  const disconnect = async () => {
    setAddress('')
    setBalance(0)
    setOriginChain(0)
  }

  useEffect(() => {
    // 监听账户变化
    wallet.onAccountsChanged(async (accounts) => {
      console.log('当前账户:', accounts[0])
      setAddress(accounts[0])
      getBalance(accounts[0])
    })

    // 监听网络变化
    wallet.onChainChanged(async () => {
      connect()
    })
  }, [])

  const confirmContent = (
    <div>
      <div style={{ width: '360px' }}>Creating target address by lit protocol, please click confirm after confirming the transaction....</div>
      <div style={{ marginTop: '10px' }} onClick={confirm}>
        <Button style={{ width: '100%', height: '36px', fontWeight: 'bold' }}>Confirm</Button>
      </div>
    </div>
  )

  const content = (
    <div>
      <div style={{ width: '360px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>Origin Chain</label>
          <Select
            defaultValue={chainList.find(item => item.value === originChain)?.value}
            options={chainList}
            menuMaxHeight={160}
            width={360}
            onChange={onOriginChainChange}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Target Chain</label>
          <Select
            defaultValue={chainList[0].value}
            options={chainList}
            menuMaxHeight={160}
            width={360}
            onChange={onTargetChainChange}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Asset</label>
          <Select
            defaultValue={assetList[0].value}
            options={assetList}
            menuMaxHeight={160}
            width={360}
            onChange={onAssetChange}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Count</label>
          <TextInput type='number' defaultValue={1} style={{ width: '100%', fontWeight: 'bold' }} onChange={inputCountChange} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Target Address</label>
          <TextInput type='text' placeholder='target address' style={{ width: '100%', fontWeight: 'bold' }} onChange={inputChange} />
        </div>
        <div style={{ marginBottom: '10px' }} onClick={transaction}>
          <Button style={{ width: '100%', height: '36px', fontWeight: 'bold' }}>Confirm</Button>
        </div>
      </div>
    </div>
  )
  return (
    <div>
      <Toolbar style={{ justifyContent: 'space-between' }}>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>Typhoon</div>
        <Toolbar style={{ justifyContent: 'flex-end', flex: 1 }}>
          {
            address && (
              <Button
                onClick={() => setOpen(true)}
                active={open}
                style={{ fontWeight: 'bold' }}
                className='bar-btn'
              >
                Create Order
              </Button>
            )
          }
        </Toolbar>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          {
            !address ? (
              <Button
                onClick={() => connect()}
                active={openConnect}
                style={{ fontWeight: 'bold' }}
                className='bar-btn'
              >
                Connect Wallet
              </Button>
            ) : (
              <div className='bar-frame'>
                <Frame style={{ padding: '0 10px' }} >{formatAddress()} | {balance} ETH</Frame>
                <MenuList
                  className='bar-menu'
                  style={{
                    position: 'absolute',
                    left: '0',
                    right: '0',
                    top: '100%',
                    zIndex: 999
                  }}
                >
                  <MenuListItem onClick={() => disconnect()}>
                    disconnect
                  </MenuListItem>
                </MenuList>
              </div>
            )
          }
          {open && <Modal title='create crosschain offer' content={content} close={() => setOpen(false)} />}
          {openConfirm && <Modal title='Notifiction' content={confirmContent} close={() => setOpenConfirm(false)} />}
        </div>
      </Toolbar>
    </div>
  );
}

export default Bar;