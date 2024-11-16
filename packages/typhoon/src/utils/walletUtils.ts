// walletUtils.ts
import { ethers } from 'ethers'

export class WalletUtils {
  private provider: any
  private signer: any
  
  // 检查是否安装了MetaMask
  public checkIfWalletIsInstalled(): boolean {
    const { ethereum } = window as any
    if (!ethereum) {
      console.log('请安装MetaMask!')
      return false
    }
    return true
  }

  // 连接钱包
  public async connectWallet(): Promise<string | null> {
    try {
      if (!this.checkIfWalletIsInstalled()) return null
      
      const { ethereum } = window as any
      this.provider = new ethers.providers.Web3Provider(ethereum)
      
      // 请求用户连接
      const accounts = await ethereum.request({ 
        method: 'eth_requestAccounts' 
      })
      
      this.signer = this.provider.getSigner()
      return accounts[0]
    } catch (error) {
      console.error('连接钱包失败:', error)
      return null
    }
  }

  // 切换网络
  public async switchNetwork(chainId: string): Promise<boolean> {
    try {
      const { ethereum } = window as any
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      })
      return true
    } catch (error: any) {
      // 如果网络不存在，添加网络
      if (error.code === 4902) {
        return await this.addNetwork()
      }
      console.error('切换网络失败:', error)
      return false
    }
  }

  // 添加网络
  private async addNetwork(): Promise<boolean> {
    try {
      const { ethereum } = window as any
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x1', // 以太坊主网
          chainName: 'Ethereum Mainnet',
          nativeCurrency: {
            name: 'ETH',
            symbol: 'ETH',
            decimals: 18
          },
          rpcUrls: ['https://mainnet.infura.io/v3/YOUR-PROJECT-ID'],
          blockExplorerUrls: ['https://etherscan.io']
        }]
      })
      return true
    } catch (error) {
      console.error('添加网络失败:', error)
      return false
    }
  }

  // 获取当前连接的账户
  public async getCurrentAccount(): Promise<string | null> {
    try {
      const { ethereum } = window as any
      const accounts = await ethereum.request({ 
        method: 'eth_accounts' 
      })
      return accounts[0] || null
    } catch (error) {
      console.error('获取账户失败:', error)
      return null
    }
  }

  // 监听账户变化
  public onAccountsChanged(callback: (accounts: string[]) => void): void {
    const { ethereum } = window as any
    ethereum.on('accountsChanged', callback)
  }

  // 监听网络变化
  public onChainChanged(callback: (chainId: string) => void): void {
    const { ethereum } = window as any
    ethereum.on('chainChanged', callback)
  }

  // 获取当前网络
  public async getCurrentChainId(): Promise<string> {
    try {
      const { ethereum } = window as any
      const chainId = await ethereum.request({ 
        method: 'eth_chainId' 
      })
      return chainId
    } catch (error) {
      console.error('获取网络失败:', error)
      return '0x1'
    }
  }

  // 发送交易
  public async sendTransaction(
    to: string, 
    value: string,
  ): Promise<string | null> {
    try {
      console.log('发送交易:', to, value, this.signer)
      const tx = await this.signer.sendTransaction({
        to,
        value: ethers.utils.parseEther(value)
      })
      return tx.hash
    } catch (error) {
      console.error('发送交易失败:', error)
      return null
    }
  }

  // 获取余额
  public async getBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address)
      return ethers.utils.formatEther(balance)
    } catch (error) {
      console.error('获取余额失败:', error)
      return '0'
    }
  }
}