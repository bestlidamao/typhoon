import React, { useState, useEffect } from 'react';
import {
  Toolbar, Button, MenuList, MenuListItem, TextInput, Frame, Select
} from 'react95';
import { WalletUtils } from '../utils/walletUtils'
import Modal from './modal'

const wallet = new WalletUtils()

const chainList = [{
  label: 'Op',
  value: 'op'
}, {
  label: 'Arb',
  value: 'arb'
}, {
  label: 'Eth',
  value: 'eth'
}, {
  label: 'Base',
  value: 'base'
}]

const assetList = [{
  label: 'ETH',
  value: 'eth'
}, {
  label: 'USDT',
  value: 'usdt'
}, {
  label: 'BTC',
  value: 'btc'
}]


function Bar() {
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [openConnect, setOpenConnect] = useState(false);
  const [chainId, setChainId] = useState(0);
  const [balance, setBalance] = useState(0);
  const [count, setCount] = useState(1);

  const onChange = (e) => {
    console.log('change', e)
  }

  const getBalance = async (addr) => {
    const balance = await wallet.getBalance(addr || address)
    setBalance((+balance).toFixed(2))
  }

  const connect = async () => {
    setOpenConnect(true)
    const account = await wallet.connectWallet()
    if (account) {
      console.log('连接的钱包地址:', account)
      setAddress(account)
      setOpenConnect(false)
      // 获取当前网络
      const chainId = await wallet.getCurrentChainId()
      setChainId(chainId)
      // 获取余额
      getBalance(account)
    }
  }

  const formatAddress = () => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const disconnect = async () => {
    setAddress('')
    setBalance(0)
    setChainId(0)
  }

  useEffect(() => {
    // 监听账户变化
    wallet.onAccountsChanged(async (accounts) => {
      console.log('当前账户:', accounts[0])
      setAddress(accounts[0])
      getBalance(accounts[0])
    })

    // 监听网络变化
    wallet.onChainChanged(async (chainId) => {
      console.log('当前网络:', chainId)
      setChainId(chainId)
      getBalance()
    })
  }, [])

  const content = (
    <div>
      <div style={{ width: '360px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>Origin Chain</label>
          <Select
            defaultValue={chainList[0].value}
            options={chainList}
            menuMaxHeight={160}
            width={360}
            onChange={onChange}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Target Chain</label>
          <Select
            defaultValue={chainList[3].value}
            options={chainList}
            menuMaxHeight={160}
            width={360}
            onChange={onChange}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Asset</label>
          <Select
            defaultValue={assetList[0].value}
            options={assetList}
            menuMaxHeight={160}
            width={360}
            onChange={onChange}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Count</label>
          <TextInput type='number' defaultValue={1} style={{ width: '100%',fontWeight: 'bold' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Target Address</label>
          <TextInput type='text' placeholder='target address' style={{ width: '100%',fontWeight: 'bold' }} />
        </div>
        <div style={{ marginBottom: '10px' }} onClick={() => setOpen(false)}>
          <Button style={{ width: '100%', height: '36px',fontWeight: 'bold' }}>Confirm</Button>
        </div>
      </div>
    </div>
  )
  return (
    <div>
      <Toolbar style={{ justifyContent: 'space-between' }}>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>Typhoon</div>
        <Toolbar style={{ justifyContent: 'flex-end', flex: 1 }}>
          <Button
            onClick={() => setOpen(!open)}
            active={open}
            style={{ fontWeight: 'bold' }}
            className='bar-btn'
          >
            Create Order
          </Button>
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
                    top: '100%'
                  }}
                  onClick={() => setOpen(false)}
                >
                  <MenuListItem onClick={() => disconnect()}>
                    disconnect
                  </MenuListItem>
                </MenuList>
              </div>
            )
          }
          { open && <Modal title='create crosschain offer' content={content} open={open} setOpen={setOpen} />}
        </div>
      </Toolbar>
    </div>
  );
}

export default Bar;