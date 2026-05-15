import{j as t,A as p,m as r}from"./vendor-motion-CY3_zbz2.js";import"./vendor-framework-gCbw6FxD.js";import{u as e}from"./styled-components.browser.esm-DWO9IDTp.js";import"./vendor-supabase-DWrHOPJX.js";const s=e(r.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
  /* Premium Centering: Offset by sidebar width to center in content area */
  padding-left: calc(280px + 20px);

  @media (max-width: 1100px) {
    padding-left: 20px;
  }
`,l=e(r.div)`
  background: #ffffff;
  width: 100%;
  max-width: 550px;
  max-height: 85vh;
  border-radius: 24px;
  border: 3px solid #10B981;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
`,c=e.div`
  padding: 24px 24px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  text-align: center;
`,x=e.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: #0b3954;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`,b=e.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
  font-size: 0.95rem;
  line-height: 1.6;
  color: #444;
  white-space: pre-wrap;
  background: #fafafa;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 10px;
  }
`,f=e.div`
  padding: 16px 24px 24px;
  display: flex;
  justify-content: center;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
`,h=e.button`
  background-color: #10B981;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 40px;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 1px;
  cursor: pointer;
  box-shadow: #059669 0 6px 0 0;
  transition: all 0.1s ease;
  text-transform: uppercase;

  &:hover {
    transform: translateY(1px);
    box-shadow: #059669 0 5px 0 0;
  }

  &:active {
    transform: translateY(6px);
    box-shadow: #059669 0 0px 0 0;
    transition: 100ms;
  }
`,y=({isOpen:i,onClose:o,title:a,content:n})=>t.jsx(p,{children:i&&t.jsx(s,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},onClick:o,children:t.jsxs(l,{initial:{scale:.9,opacity:0,y:20},animate:{scale:1,opacity:1,y:0},exit:{scale:.9,opacity:0,y:20},onClick:d=>d.stopPropagation(),children:[t.jsx(c,{children:t.jsx(x,{children:a})}),t.jsx(b,{children:n}),t.jsx(f,{children:t.jsx(h,{onClick:o,children:"Close"})})]})})});export{y as default};
//# sourceMappingURL=LegalModal-DNfJZgS7.js.map
