import{r,j as o,b as yt}from"./vendor-framework-CmdwDIpY.js";import{F as wt,h as vt}from"./vendor-icons-extra-DxNdmJeq.js";import{a as ut,b as N}from"./assetUtils-DiP9gMzg.js";import{u as Tt}from"./index-BMG3oc94.js";/* empty css                        */import"./vendor-icons-core-CZMWesfg.js";import"./vendor-supabase-DaITVRM7.js";const kt=ut("Robot/0008-noBulb-inverted.png"),Et=N("Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 1.mp3"),It=N("Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 2.mp3"),At=N("Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 3.mp3"),Pt=N("Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 4.mp3"),jt=N("Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 5.mp3"),Mt=N("Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial FINAL.mp3"),Rt=ut("Robot/0002.webp"),st="https://assets.bigkas.site/Images/Bigkas-Logo.webp",Bt="Your Streak counter tracks how many consecutive days you've practiced. Consistency is the true secret to mastering public speaking! Log in and complete a daily activity to keep the fire burning and watch that number grow.",Lt="https://assets.bigkas.site/Voices/Home%20Page/Tutorials/Streak-Counter.mp3",ct=r.memo(({text:l,fullText:y,isDone:F,emphasis:u})=>{if(!F)return o.jsx(o.Fragment,{children:l});if(!u)return o.jsx(o.Fragment,{children:y});const k=y.indexOf(u);if(k<0)return o.jsx(o.Fragment,{children:y});const V=y.slice(0,k),$=y.slice(k+u.length);return o.jsxs(o.Fragment,{children:[V,o.jsx("strong",{className:"tutorial-bubble-emphasis",children:u}),$]})});ct.displayName="TypingText";function Nt({isOpen:l,onClose:y,onFinish:F,steps:u=null,robotImage:k=kt,finalRobotImage:V=Rt,showAudioToggle:$=!1,onCloseDashboard:I=void 0}){const{user:m,updateUserMetadata:mt}=Tt(),J="bigkas_global_audio_muted_v1",Q=r.useMemo(()=>[{id:"step-intro",title:"B-01:",text:"Before we jump in, let's do a quick walkthrough of how this works! Ready to get started?",button:"Continue",targetElementId:null},{id:"step-topic",title:"B-01:",text:"'The Topic' This is for your Verbal analysis! Focus on the prompt shown here to ensure your content is clear and stays on track.",button:"Continue",targetElementId:"tutorial-target-topic",emphasis:"'The Topic'"},{id:"step-camera",title:"B-01:",text:"'The Camera View' This is for your Visual analysis! Position yourself within the guide so I can accurately track your eye contact, expressions, and gestures. Also, make sure you're in a well-lit room so I can see you clearly—good lighting makes for a great performance!",button:"Next",targetElementId:"tutorial-target-camera",emphasis:"'The Camera View'"},{id:"step-soundbar",title:"B-01:",text:"'Voice Meter' This is for your Vocal analysis! Watch the soundbar dance as you speak to see your projection and emotional expression.",button:"Next",targetElementId:"tutorial-target-soundbar",emphasis:"'Voice Meter'"},{id:"step-controls",title:"B-01:",text:"'The Controls', Use Start to begin, Pause if you need a breather, or Restart to try the topic again from the top!",button:"Next",targetElementId:"tutorial-target-controls",emphasis:"'The Controls'"},{id:"step-final",title:"B-01:",text:"Controls mastered! Yay! Whenever you're ready, click Start so I can hear what you've got. I'm so excited to listen!",button:"BEGIN!",targetElementId:null}],[]),H=r.useMemo(()=>Array.isArray(u)&&u.length>0?u:Q,[Q,u]),A=r.useMemo(()=>!(Array.isArray(u)&&u.length>0),[u]),b=Array.isArray(u)&&u.length>0,[h,S]=r.useState(0),[f,q]=r.useState(0),[pt,D]=r.useState(""),[Y,G]=r.useState(!1),[p,dt]=r.useState(()=>typeof window!="undefined"&&window.matchMedia("(max-width: 768px)").matches),[c,O]=r.useState(()=>typeof window=="undefined"?!1:m&&typeof m.isAudioMuted=="boolean"?m.isAudioMuted:window.localStorage.getItem(J)==="1");r.useEffect(()=>{if(typeof window=="undefined")return;const e=window.matchMedia("(max-width: 768px)"),i=()=>dt(e.matches);return typeof e.addEventListener=="function"?(e.addEventListener("change",i),()=>e.removeEventListener("change",i)):(e.addListener(i),()=>e.removeListener(i))},[]),r.useEffect(()=>{m&&typeof m.isAudioMuted=="boolean"&&O(m.isAudioMuted)},[m==null?void 0:m.isAudioMuted]);const a=r.useRef(null),tt=r.useRef(null),v=r.useRef([]),g=r.useRef(null),s=r.useRef(null),K=r.useRef(!1),W=r.useRef(!1),et=r.useRef(c);r.useEffect(()=>{et.current=c},[c]);const[P,X]=r.useState(null),t=r.useMemo(()=>H[h],[H,h]),C=r.useMemo(()=>t!=null&&t.text?t.textPart2&&f===1?t.textPart2:p&&t.id==="step-streak"?Bt:t.text:"",[t,p,f]),j=r.useMemo(()=>{var e;return t?p&&t.id==="step-streak"?Lt:f===1&&t.voicePart2?t.voicePart2:f===1?null:(e=t.voice)!=null?e:null:null},[t,p,f]),rt=r.useMemo(()=>t?t.robot||(t.id==="step-final"?V:k):k,[t,V,k]),bt=(t==null?void 0:t.id)==="step-intro"||(t==null?void 0:t.id)==="step-companion",M=!!(!b&&p&&(t==null?void 0:t.id)!=="step-final"||b&&((t==null?void 0:t.id)==="step-streak"||p&&!bt)),ht=r.useMemo(()=>M?st:rt,[M,rt]),_=(t==null?void 0:t.targetElementId)==="tutorial-target-home-streak"||(t==null?void 0:t.targetElementId)==="tutorial-target-home-rank"||(t==null?void 0:t.targetElementId)==="tutorial-target-home-practice",ot=(t==null?void 0:t.id)==="step-streak",Z=()=>{typeof document!="undefined"&&document.querySelectorAll(".tutorial-spotlight-active").forEach(e=>{e.classList.remove("tutorial-spotlight-active")})},E=()=>{v.current.forEach(e=>{e&&(e.pause(),e.currentTime=0)}),g.current&&(g.current.pause(),g.current.currentTime=0,g.current=null)},ft=()=>{O(e=>{const i=!e;return typeof window!="undefined"&&window.localStorage.setItem(J,i?"1":"0"),m!=null&&m.id&&mt({is_audio_muted:i}).catch(()=>{}),i&&E(),i})};if(r.useEffect(()=>{if(!A){v.current=[];return}return v.current=[new Audio(Et),new Audio(It),new Audio(At),new Audio(Pt),new Audio(jt),new Audio(Mt)],v.current.forEach(e=>{e&&(e.preload="none")}),()=>{E(),v.current=[]}},[A]),r.useEffect(()=>{if(v.current.forEach(e=>{e&&(e.muted=c,c&&(e.pause(),e.currentTime=0))}),g.current&&(g.current.muted=c,c&&(g.current.pause(),g.current.currentTime=0)),!c&&l&&t){if(E(),j){const e=new Audio(j);e.muted=!1,g.current=e,e.play().catch(()=>{})}else if(A){const e=v.current[h];e&&(e.muted=!1,e.currentTime=0,e.play().catch(()=>{}))}}},[c,l,t,j,A,h]),r.useEffect(()=>{if(l){W.current=!0,Z(),S(0),q(0);return}W.current&&I&&b&&p&&I(),W.current=!1,Z(),E(),s.current&&(window.clearInterval(s.current),s.current=null),a.current&&(a.current.classList.remove("tutorial-spotlight-active"),a.current.style.removeProperty("pointer-events"),a.current=null)},[l,I,b,p]),r.useEffect(()=>{q(0)},[h]),r.useEffect(()=>{K.current=!1},[h]),r.useEffect(()=>{var R;if(!l||!t)return;const e=t.targetElementId;if(e!=="tutorial-target-home-streak"&&e!=="tutorial-target-home-rank"&&e!=="tutorial-target-home-practice"||typeof document=="undefined"||document.getElementById(e)||K.current)return;const i=document.querySelector(".activity-mobile-dashboard-section"),n=i==null?void 0:i.querySelector("button.activity-mobile-dashboard-btn"),w=(R=n==null?void 0:n.textContent)==null?void 0:R.trim().toLowerCase();n&&w==="dashboard"&&(n.click(),K.current=!0)},[l,t==null?void 0:t.id,t==null?void 0:t.targetElementId,h]),r.useEffect(()=>{if(!l||!t)return;Z(),a.current&&(a.current.classList.remove("tutorial-spotlight-active"),a.current.style.removeProperty("z-index"),a.current.style.removeProperty("pointer-events"),a.current=null);const e=t==null?void 0:t.targetElementId,i=b&&e==="tutorial-target-home-journey"?"4600":"4800",n=e==="tutorial-target-home-streak"||e==="tutorial-target-home-rank"||e==="tutorial-target-home-practice",w=e==="tutorial-target-home-streak"||e==="tutorial-target-home-rank"||e==="tutorial-target-home-practice",R=n?48:6,T=n?80:60;let B=!1,L=null;const z=(U=0)=>{if(B||!e)return;const x=document.getElementById(e);if(x){if(x.classList.add("tutorial-spotlight-active"),x.style.setProperty("z-index",i,"important"),w&&x.style.setProperty("pointer-events","none","important"),a.current=x,e==="tutorial-target-home-practice"){const d=document.querySelector(".dashboard-overlay-scroll-content")||document.querySelector(".dashboard-overlay-content");if(d){try{d.scrollTo({top:d.scrollHeight,behavior:"smooth"})}catch{d.scrollTop=d.scrollHeight}setTimeout(()=>{d&&(d.scrollTop=d.scrollHeight)},60)}}else if(e==="tutorial-target-home-journey")try{x.scrollIntoView({behavior:"smooth",block:"start"})}catch{}else try{x.scrollIntoView({behavior:"smooth",block:"center"})}catch{}return}U>=R||(L=window.setTimeout(()=>z(U+1),T))};return e&&z(0),()=>{B=!0,L&&window.clearTimeout(L),a.current&&(a.current.classList.remove("tutorial-spotlight-active"),a.current.style.removeProperty("z-index"),a.current.style.removeProperty("pointer-events"),a.current=null)}},[l,t==null?void 0:t.targetElementId,b]),r.useEffect(()=>{!l||!p||!b||!I||(t==null?void 0:t.targetElementId)==="tutorial-target-home-journey"&&I()},[l,p,b,t==null?void 0:t.targetElementId,h,f,I]),r.useEffect(()=>{if(!l||!t){X(null);return}if(!(!(!b&&p&&(t.id==="step-controls"||t.id==="step-soundbar"))&&(t.id==="step-controls"||t.id==="step-soundbar"||t.id==="step-roadmap"||t.id==="step-practice"))){X(null);return}let n=0,w=0;const R=()=>{const B=t.targetElementId?document.getElementById(t.targetElementId):null,L=tt.current;if(!B||!L)return!1;const z=B.getBoundingClientRect(),U=L.getBoundingClientRect(),x=parseFloat(window.getComputedStyle(document.documentElement).fontSize)||16,d=t.id==="step-roadmap"?x:0,lt=x*2+d,xt=Math.max(8,z.top-U.height-lt);return X({top:`${xt}px`,bottom:"auto",zIndex:5100}),!0},T=()=>{n=window.requestAnimationFrame(()=>{R()||(w=window.setTimeout(T,60))})};return T(),window.addEventListener("resize",T),window.addEventListener("orientationchange",T),()=>{n&&window.cancelAnimationFrame(n),w&&window.clearTimeout(w),window.removeEventListener("resize",T),window.removeEventListener("orientationchange",T)}},[l,t==null?void 0:t.id,t==null?void 0:t.targetElementId,f,b,p]),r.useEffect(()=>{if(!l||!t)return;D(""),G(!1),s.current&&(window.clearInterval(s.current),s.current=null);let e=0;const i=C;if(s.current=window.setInterval(()=>{e+=1,D(i.slice(0,e)),e>=i.length&&(s.current&&(window.clearInterval(s.current),s.current=null),G(!0))},12),!et.current){if(E(),j){const n=new Audio(j);n.muted=!1,g.current=n,n.play().catch(w=>console.warn("[TutorialOverlayMobile] Custom voice play failed:",w))}else if(A){const n=v.current[h];n&&(n.currentTime=0,n.play().catch(()=>{}))}}return()=>{s.current&&(window.clearInterval(s.current),s.current=null),E()}},[h,l,A,t==null?void 0:t.id,C,j,f]),!l||!t)return null;const gt=()=>{if(E(),!Y){D(C),G(!0),s.current&&(window.clearInterval(s.current),s.current=null);return}if(t.textPart2&&f===0){q(1);return}if(h>=H.length-1){a.current&&(a.current.classList.remove("tutorial-spotlight-active"),a.current.style.removeProperty("z-index"),a.current.style.removeProperty("pointer-events"),a.current=null),F==null||F(),y==null||y();return}S(i=>i+1)},it=`tutorial-overlay-wrapper${b?" is-custom-tutorial":" is-default-tutorial"}${(t==null?void 0:t.id)==="step-controls"?" is-controls-step":""}${(t==null?void 0:t.id)==="step-soundbar"?" is-soundbar-step":""}${(t==null?void 0:t.id)==="step-final"?" is-final-step":""}${(t==null?void 0:t.id)==="step-rank"?" is-rank-step":""}${t!=null&&t.robotClassName?` ${t.robotClassName}`:""}`,at=o.jsx(o.Fragment,{children:o.jsxs("div",{className:"tutorial-companion-container",ref:tt,style:_?{...P!=null?P:{},pointerEvents:"auto"}:P!=null?P:void 0,children:[M?null:o.jsx("img",{src:ht,alt:"",className:"tutorial-robot-img","aria-hidden":"true"}),o.jsxs("article",{className:`tutorial-speech-bubble${M?" tutorial-speech-bubble--logo":""}`,children:[o.jsx("div",{className:`tutorial-bubble-title${M?" tutorial-bubble-title--with-brand":""}`,children:M?o.jsxs(o.Fragment,{children:[o.jsx("img",{src:st,alt:"",className:"tutorial-bubble-title-logo",width:36,height:36}),o.jsx("span",{className:"tutorial-bubble-title-label",children:t.title})]}):t.title}),o.jsx("p",{className:"tutorial-bubble-text",children:o.jsx(ct,{text:pt,fullText:C,isDone:Y,emphasis:f===0?t.emphasis:void 0})}),o.jsxs("div",{className:"tutorial-bubble-footer",children:[$&&o.jsx("button",{type:"button",onClick:ft,"aria-label":c?"Unmute B-01 voice":"Mute B-01 voice",title:c?"Unmute B-01 voice":"Mute B-01 voice",className:`tutorial-audio-toggle ${c?"is-muted":"is-unmuted"}`,children:c?o.jsx(wt,{"aria-hidden":"true"}):o.jsx(vt,{"aria-hidden":"true"})}),o.jsx("button",{type:"button",className:"tutorial-bubble-btn",onClick:gt,disabled:!Y,children:t.button})]})]})]})}),nt=_&&typeof document!="undefined"?yt.createPortal(o.jsxs(o.Fragment,{children:[ot?o.jsx("div",{className:"bigkas-modal-scrim bigkas-modal-scrim--no-enter tutorial-mobile-streak-scrim","aria-hidden":"true",style:{position:"fixed",inset:0,zIndex:1800,pointerEvents:"none",background:"rgba(15, 23, 42, 0.5)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)"}}):null,o.jsx("div",{className:it,style:{position:"fixed",inset:0,zIndex:7200,pointerEvents:"none"},"aria-label":"Training tutorial overlay",children:at})]}),document.body):null;return o.jsxs(o.Fragment,{children:[l&&ot?o.jsx("style",{children:`
          /*
           * Streak tutorial: scrim is portaled to document.body (z-index 1800). #root stacks as auto,
           * so the scrim paints above the whole app and hides the spotlight. Raise #root while this
           * step is open so dashboard content (including #tutorial-target-home-streak) stacks above the scrim.
           */
          #root {
            position: relative;
            z-index: 1850 !important;
          }
        `}):null,_?null:o.jsx("div",{className:"tutorial-dark-bg","aria-hidden":"true"}),o.jsx("style",{children:`
        #tutorial-target-home-journey.tutorial-spotlight-active button {
          pointer-events: none !important;
          cursor: default !important;
        }
        .tutorial-overlay-wrapper.is-custom-tutorial .tutorial-speech-bubble--logo::before,
        .tutorial-overlay-wrapper.is-default-tutorial .tutorial-speech-bubble--logo::before,
        .tutorial-overlay-wrapper.is-custom-tutorial.is-activity-home-step-3 .tutorial-speech-bubble::before {
          display: none !important;
          content: none !important;
          border: none !important;
        }
        .tutorial-bubble-title--with-brand {
          display: flex !important;
          align-items: center !important;
          gap: 0.5rem !important;
          flex-wrap: nowrap !important;
          font-weight: 400 !important;
        }
        .tutorial-bubble-title-logo {
          width: 36px !important;
          height: 36px !important;
          object-fit: contain !important;
          flex-shrink: 0 !important;
          display: block !important;
        }
        .tutorial-bubble-title--with-brand .tutorial-bubble-title-label {
          font-family: 'Fredoka', sans-serif !important;
          font-weight: 400 !important;
          color: #059669 !important;
        }
        /* Mobile activity tutorial: logo mark + bubble; dashboard steps portal above sheets */
        @media (max-width: 768px) {
          /* Automatically suppress the tutorial's standalone dark background scrim whenever the dashboard sheet is actively open */
          body:has(.dashboard-overlay-wrapper) .tutorial-dark-bg,
          body.dashboard-overlay-open .tutorial-dark-bg {
            display: none !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
          /* Ensure targeted elements inside the dashboard sheet elevate properly into the sheet's stacking context */
          .dashboard-overlay-content .tutorial-spotlight-active {
            position: relative !important;
            z-index: 4800 !important;
            background: #ffffff !important;
            box-shadow: 0 0 0 5px #34D399, 0 0 42px rgba(52, 211, 153, 0.9) !important;
          }
          .dashboard-overlay-wrapper:has(.tutorial-spotlight-active) .dashboard-overlay-content::after {
            content: '' !important;
            position: absolute !important;
            inset: 0 !important;
            z-index: 4700 !important;
            pointer-events: none !important;
            background: rgba(15, 23, 42, 0.5) !important;
            -webkit-backdrop-filter: blur(4px) !important;
            backdrop-filter: blur(4px) !important;
          }
          .dashboard-overlay-wrapper:has(.tutorial-spotlight-active) .dashboard-overlay-scroll-content > *:not(.tutorial-spotlight-active),
          .dashboard-overlay-wrapper:has(.tutorial-spotlight-active) .dashboard-overlay-header {
            pointer-events: none !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial .tutorial-companion-container {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 0.5rem !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: min(calc(100vw - clamp(16px, 6vw, 32px)), 54rem) !important;
            max-width: calc(100vw - 32px) !important;
            bottom: calc(clamp(104px, 18vh, 148px) + env(safe-area-inset-bottom, 0px)) !important;
            top: auto !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial.is-rank-step .tutorial-companion-container {
            top: calc(16px + 2rem + env(safe-area-inset-top, 0px)) !important;
            bottom: auto !important;
          }
          /* Home streak (activity step 3): pin speech bubble to top so the streak card stays visible below */
          .tutorial-overlay-wrapper.is-custom-tutorial.is-activity-home-step-3 .tutorial-companion-container {
            top: calc(16px + 0.5rem + env(safe-area-inset-top, 0px)) !important;
            bottom: auto !important;
            left: 16px !important;
            transform: none !important;
            align-items: stretch !important;
            width: min(calc(100vw - 32px), 54rem) !important;
            max-width: calc(100vw - 32px) !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial.is-practice-step .tutorial-companion-container {
            top: calc(16px + 0.5rem + env(safe-area-inset-top, 0px)) !important;
            bottom: auto !important;
          }
          /* Roadmap: Positioned at bottom with 1rem gap above bottom navigation */
          .tutorial-overlay-wrapper.is-custom-tutorial.is-roadmap-step .tutorial-companion-container {
            top: auto !important;
            bottom: calc(64px + 1rem + env(safe-area-inset-bottom, 0px)) !important;
            gap: 0.5rem !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial.is-roadmap-step .tutorial-speech-bubble {
            padding-bottom: 0.65rem !important;
          }
          /* New positioning for mute button inside bubble */
          .tutorial-bubble-footer {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            width: 100% !important;
            gap: 12px !important;
            margin-top: 10px !important;
            clear: both !important;
          }
          .tutorial-bubble-footer .tutorial-audio-toggle {
            position: relative !important;
            inset: auto !important;
            transform: none !important;
            flex-shrink: 0 !important;
            width: clamp(3rem, 5.5vw, 3.45rem) !important;
            height: clamp(3rem, 5.5vw, 3.45rem) !important;
            min-height: 44px !important;
            min-width: 44px !important;
            border-radius: 0.95rem !important;
            transition: transform 0.2s ease, box-shadow 0.2s ease !important;
          }
          .tutorial-bubble-footer .tutorial-audio-toggle:hover {
            transform: translateY(2px) !important;
          }
          .tutorial-bubble-footer .tutorial-audio-toggle.is-unmuted:hover {
            box-shadow: #047857 0 3px 0 0 !important;
          }
          .tutorial-bubble-footer .tutorial-audio-toggle.is-muted:hover {
            box-shadow: #B91C1C 0 3px 0 0 !important;
          }
          .tutorial-bubble-footer .tutorial-audio-toggle:active {
            transform: translateY(5px) !important;
          }
          .tutorial-bubble-footer .tutorial-audio-toggle.is-unmuted:active {
            box-shadow: #047857 0 0 0 0 !important;
          }
          .tutorial-bubble-footer .tutorial-audio-toggle.is-muted:active {
            box-shadow: #B91C1C 0 0 0 0 !important;
          }
          .tutorial-bubble-footer .tutorial-bubble-btn {
            float: none !important;
            margin: 0 !important;
            flex: 0 0 auto !important;
          }

          .tutorial-overlay-wrapper.is-custom-tutorial.is-roadmap-step .tutorial-bubble-text {
            max-height: min(26vh, 132px) !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial.is-roadmap-step .tutorial-robot-img:not(.tutorial-robot-img--logo) {
            max-height: 76px !important;
            max-width: 148px !important;
            width: auto !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial .tutorial-speech-bubble {
            order: 1 !important;
            z-index: 1301 !important;
            width: 100% !important;
            max-width: min(100%, 48rem) !important;
            margin: 0 !important;
          }
          .tutorial-overlay-wrapper.is-default-tutorial .tutorial-speech-bubble--logo {
            width: 100% !important;
            max-width: min(100%, 48rem) !important;
            margin: 0 !important;
          }
          .tutorial-overlay-wrapper.is-default-tutorial .tutorial-companion-container {
            align-items: stretch !important;
          }
          .tutorial-overlay-wrapper.is-default-tutorial.is-final-step .tutorial-companion-container {
            top: calc(clamp(96px, 15vh, 128px) + env(safe-area-inset-top, 0px)) !important;
            bottom: auto !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: min(calc(100vw - 32px), 420px) !important;
            max-width: calc(100vw - 32px) !important;
            align-items: center !important;
            justify-content: flex-start !important;
          }
          .tutorial-overlay-wrapper.is-default-tutorial.is-final-step .tutorial-speech-bubble {
            width: 100% !important;
            max-width: 100% !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial.is-activity-home-step-1 .tutorial-speech-bubble,
          .tutorial-overlay-wrapper.is-custom-tutorial.is-activity-home-step-2 .tutorial-speech-bubble {
            transform: translateY(8rem) !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial:not(.is-activity-home-step-1):not(.is-activity-home-step-2) .tutorial-speech-bubble {
            transform: translateY(0) !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial .tutorial-speech-bubble::before {
            left: 50% !important;
            top: auto !important;
            bottom: -12px !important;
            border-top: 12px solid #FDFDF9 !important;
            border-bottom: 0 !important;
            border-right: 12px solid transparent !important;
            border-left: 12px solid transparent !important;
            transform: translateX(-50%) !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial .tutorial-robot-img.tutorial-robot-img--logo {
            order: 2 !important;
            width: auto !important;
            max-width: 180px !important;
            max-height: 64px !important;
            height: auto !important;
            object-fit: contain !important;
            filter: none !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial .tutorial-robot-img:not(.tutorial-robot-img--logo) {
            order: 2 !important;
            width: clamp(160px, 48vw, 280px) !important;
            height: auto !important;
            filter: drop-shadow(0 10px 18px rgba(15, 23, 42, 0.18)) !important;
          }
          .tutorial-overlay-wrapper.is-custom-tutorial.is-activity-home-step-1 .tutorial-robot-img:not(.tutorial-robot-img--logo),
          .tutorial-overlay-wrapper.is-custom-tutorial.is-activity-home-step-2 .tutorial-robot-img:not(.tutorial-robot-img--logo) {
            order: 2 !important;
            width: clamp(320px, 85vw, 520px) !important;
            height: auto !important;
            filter: drop-shadow(0 10px 18px rgba(15, 23, 42, 0.18)) !important;
          }
        }
      `}),_&&nt?nt:o.jsx("section",{className:it,"aria-label":"Training tutorial overlay",children:at})]})}const Ht=r.memo(Nt);export{Ht as default};
