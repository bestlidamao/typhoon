import React, { useState, useEffect } from 'react';
import { useGlobal } from '../context/GlobalContext';
import {
  Button, Frame
} from 'react95';
import Modal from './Modal'
import { WalletUtils } from '../utils/walletUtils'
import Convert from '../assets/convert.png';
import { chainList } from '../libs/data.js'

const wallet = new WalletUtils()

function List() {
  const { state, actions } = useGlobal()
  const [showModal, setShowModal] = useState(false);

  const getChainImg = (chainId) => {
    const chain = chainList.find(item => item.value === chainId)
    return chain ? chain.img : ''
  }

  const transaction = async () => {
    await wallet.connectWallet()
    console.log('confirm')
    const { originChain, amount } = state.list[0]
    const toAddress = '0xbbA51F0b09d5852eFfa609E9223ba7F5d7407945'
    const chainId = await wallet.getCurrentChainId()
    if (chainId !== originChain) {
      console.log('switch network', originChain)
      await wallet.switchNetwork(originChain)
      return
    }
    try {
      const hash = await wallet.sendTransaction(toAddress, amount.toString())
      console.log('hash:', hash)
    } catch (error) {
      console.log('error:', error)
      setOpenConfirm(false)
    }
    // setOpen(false)
  }

  const content = (
    <div style={{ width: '300px' }}>
      <p>A similar transaction already exists in the memory pool. Would you like to proceed with the transaction?</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
        <Button onClick={() => setShowModal(false)} style={{ width: '100%', height: '36px', fontWeight: 'bold', marginTop: '10px' }}>Cancel</Button>
        <Button onClick={transaction} style={{ width: '100%', height: '36px', fontWeight: 'bold', marginTop: '10px' }}>Confirm</Button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: '30px' }}>
      {
        state.list.map((item, index) => (
          <Frame variant='outside' shadow style={{ padding: '10px', lineHeight: '1.5', minWidth: "300px" }} key={index}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }} className='convert-wrap'>
              <img src={getChainImg(item.originChain)} alt="" />
              <img src={Convert} alt="" style={{ width: '32px', height: '32px', margin: '0 14px' }} />
              <img src={getChainImg(item.targetChain)} alt="" />
              <span style={{ fontSize: '24px', marginLeft: '8px' }}>{item.amount} {item.asset.toLocaleUpperCase()}</span>
            </div>
            <Button onClick={() => {
              if (index == 0) setShowModal(true)
            }} style={{ display: 'block', margin: '10px auto 0', width: '100%' }}>Confirm Order</Button>
          </Frame>
        ))
      }

      {showModal && <Modal title='Alert' content={content} close={() => setShowModal(false)} />}
    </div>
  );
}

export default List;