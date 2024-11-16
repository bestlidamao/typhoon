import React from 'react';
import {
  Frame,
  Window,
  WindowContent,
  WindowHeader, styleReset
} from 'react95';
import { createGlobalStyle, ThemeProvider } from 'styled-components';
import original from 'react95/dist/themes/original';
import ms_sans_serif from 'react95/dist/fonts/ms_sans_serif.woff2';
import ms_sans_serif_bold from 'react95/dist/fonts/ms_sans_serif_bold.woff2';
import Bar from './components/AppBar';

const GlobalStyles = createGlobalStyle`
  ${styleReset}
  @font-face {
    font-family: 'ms_sans_serif';
    src: url('${ms_sans_serif}') format('woff2');
    font-weight: 400;
    font-style: normal
  }
  @font-face {
    font-family: 'ms_sans_serif';
    src: url('${ms_sans_serif_bold}') format('woff2');
    font-weight: bold;
    font-style: normal
  }
  body, input, select, textarea {
    font-family: 'ms_sans_serif';
  }
`;

const App = () => (
  <div className='content'>
    <GlobalStyles />
    <ThemeProvider theme={original}>
      <Window style={{width: '100%', height: '100%'}}>
        <WindowHeader style={{height: 'auto', padding: '0'}}><Bar /></WindowHeader>
        {/* <Bar /> */}
      </Window>
    </ThemeProvider>
  </div>
);

export default App;