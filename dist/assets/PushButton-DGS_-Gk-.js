import{j as t}from"./vendor-motion-BXP49Ir3.js";import"./vendor-framework-gCbw6FxD.js";import{u as l}from"./styled-components.browser.esm-DWO9IDTp.js";const i=l.div`
  width: 100%;

  button {
    width: 100%;
    padding: 17px 40px;
    border-radius: 10px;
    border: 0;
    background-color: ${o=>o.$bgColor||"rgb(255, 56, 86)"};
    letter-spacing: 1.5px;
    font-size: 15px;
    transition: all 0.3s ease;
    box-shadow: ${o=>o.$shadowColor||"rgb(201, 46, 70)"} 0px 10px 0px 0px;
    color: ${o=>o.$textColor||"hsl(0, 0%, 100%)"};
    cursor: pointer;
    font-weight: 800;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    font-family: 'Nunito', sans-serif;
  }

  button:hover:not(:disabled) {
    box-shadow: ${o=>o.$shadowColor||"rgb(201, 46, 70)"} 0px 7px 0px 0px;
    transform: translateY(3px);
  }

  button:active:not(:disabled) {
    background-color: ${o=>o.$bgColor||"rgb(255, 56, 86)"};
    box-shadow: ${o=>o.$shadowColor||"rgb(201, 46, 70)"} 0px 0px 0px 0px;
    transform: translateY(10px);
    transition: 200ms;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: translateY(0);
    box-shadow: ${o=>o.$shadowColor||"rgb(201, 46, 70)"} 0px 10px 0px 0px;
  }
`,c=({children:o,onClick:r,type:s="button",disabled:a=!1,className:n,bgColor:e,shadowColor:p,textColor:x})=>t.jsx(i,{className:n,$bgColor:e,$shadowColor:p,$textColor:x,children:t.jsx("button",{type:s,onClick:r,disabled:a,children:o})});export{c as P};
//# sourceMappingURL=PushButton-DGS_-Gk-.js.map
