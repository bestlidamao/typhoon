import React, { useState, useEffect } from 'react';
import {
  Window,
  WindowContent,
  WindowHeader,
  Button
} from 'react95';

function Modal({ title, content, close, hiddenClose }) {
  return (
    <div className='modal'>
      <Window>
        <WindowHeader>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            {title}
            {
              hiddenClose ? null : (
                <Button onClick={close}>
                  <span className='close-icon' />
                </Button>
              )
            }
          </div>
        </WindowHeader>
        <WindowContent>{content}</WindowContent>
      </Window>
    </div>
  );
}

export default Modal;