// store/GlobalContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { list } from '../libs/index.js';

const GlobalContext = createContext(null);

export function GlobalProvider({ children }) {
  const [state, setState] = useState({
    list: []
  });

  const initialize = async () => {
    try {
      // 从localStorage获取持久化数据
      const listLocal = localStorage.getItem('list');
      if (listLocal) {
        setState(() => ({
          list: JSON.parse(listLocal),
        }));
      } else {
        // 如果localStorage中没有数据，使用默认数据
        console.log('list', list)
        setState(() => ({
          list,
        }));
      }
    } catch (error) {
      console.error('initialize error:', error);
    }
  };

  const updateState = (newState) => {
    setState(prev => ({ ...prev, ...newState }));
  };

  const actions = {
    setList: (list) => updateState({ list })
  };

  useEffect(() => {
    initialize();
  }, []);

  return (
    <GlobalContext.Provider value={{ state, actions }}>
      {children}
    </GlobalContext.Provider>
  );
}


export const useGlobal = () => useContext(GlobalContext);