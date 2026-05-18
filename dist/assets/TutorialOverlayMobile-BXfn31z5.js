import{j as o}from"./vendor-motion-Dc5yExsh.js";import{r,b as yt}from"./vendor-framework-D3vCv3Kb.js";import{F as xt,h as wt}from"./vendor-icons-extra-DLKP38um.js";import{a as ut,b as R}from"./assetUtils-DiP9gMzg.js";import{u as Tt}from"./index-BvEOtUIm.js";/* empty css                        */import"./vendor-icons-core-q26kh0ql.js";import"./vendor-supabase-DWrHOPJX.js";const kt=ut("Robot/0008-noBulb-inverted.png"),Et=R("Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 1.mp3"),It=R("Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 2.mp3"),St=R("Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 3.mp3"),At=R("Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 4.mp3"),Pt=R("Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial 5.mp3"),jt=R("Profiling and Pre-Testing/Pre-Testing Tutorial/pre-testing tutorial FINAL.mp3"),Mt=ut("Robot/0002.webp"),lt="https://assets.bigkas.site/Images/Bigkas-Logo.webp",Rt="Your Streak counter tracks how many consecutive days you've practiced. Consistency is the true secret to mastering public speaking! Log in and complete a daily activity to keep the fire burning and watch that number grow.",Ct="https://assets.bigkas.site/Voices/Home%20Page/Tutorials/Streak-Counter.mp3",ct=r.memo(({text:a,fullText:T,isDone:V,emphasis:u})=>{if(!V)return o.jsx(o.Fragment,{children:a});if(!u)return o.jsx(o.Fragment,{children:T});const k=T.indexOf(u);if(k<0)return o.jsx(o.Fragment,{children:T});const C=T.slice(0,k),_=T.slice(k+u.length);return o.jsxs(o.Fragment,{children:[C,o.jsx("strong",{className:"tutorial-bubble-emphasis",children:u}),_]})});ct.displayName="TypingText";function Ft({isOpen:a,onClose:T,onFinish:V,steps:u=null,robotImage:k=kt,finalRobotImage:C=Mt,showAudioToggle:_=!1,onCloseDashboard:I=void 0}){const{user:y,updateUserMetadata:pt}=Tt(),X="bigkas_global_audio_muted_v1",Z=r.useMemo(()=>[{id:"step-intro",title:"B-01:",text:"Before we jump in, let's do a quick walkthrough of how this works! Ready to get started?",button:"Continue",targetElementId:null},{id:"step-topic",title:"B-01:",text:"'The Topic' This is for your Verbal analysis! Focus on the prompt shown here to ensure your content is clear and stays on track.",button:"Continue",targetElementId:"tutorial-target-topic",emphasis:"'The Topic'"},{id:"step-camera",title:"B-01:",text:"'The Camera View' This is for your Visual analysis! Position yourself within the guide so I can accurately track your eye contact, expressions, and gestures. Also, make sure you're in a well-lit room so I can see you clearly—good lighting makes for a great performance!",button:"Next",targetElementId:"tutorial-target-camera",emphasis:"'The Camera View'"},{id:"step-soundbar",title:"B-01:",text:"'Voice Meter' This is for your Vocal analysis! Watch the soundbar dance as you speak to see your projection and emotional expression.",button:"Next",targetElementId:"tutorial-target-soundbar",emphasis:"'Voice Meter'"},{id:"step-controls",title:"B-01:",text:"'The Controls', Use Start to begin, Pause if you need a breather, or Restart to try the topic again from the top!",button:"Next",targetElementId:"tutorial-target-controls",emphasis:"'The Controls'"},{id:"step-final",title:"B-01:",text:"Controls mastered! Yay! Whenever you're ready, click Start so I can hear what you've got. I'm so excited to listen!",button:"BEGIN!",targetElementId:null}],[]),z=r.useMemo(()=>Array.isArray(u)&&u.length>0?u:Z,[Z,u]),S=r.useMemo(()=>!(Array.isArray(u)&&u.length>0),[u]),d=Array.isArray(u)&&u.length>0,[b,J]=r.useState(0),[h,U]=r.useState(0),[mt,$]=r.useState(""),[H,q]=r.useState(!1),[p,dt]=r.useState(()=>typeof window<"u"&&window.matchMedia("(max-width: 768px)").matches),[c,Q]=r.useState(()=>typeof window>"u"?!1:y&&typeof y.isAudioMuted=="boolean"?y.isAudioMuted:window.localStorage.getItem(X)==="1");r.useEffect(()=>{if(typeof window>"u")return;const e=window.matchMedia("(max-width: 768px)"),n=()=>dt(e.matches);return typeof e.addEventListener=="function"?(e.addEventListener("change",n),()=>e.removeEventListener("change",n)):(e.addListener(n),()=>e.removeListener(n))},[]),r.useEffect(()=>{y&&typeof y.isAudioMuted=="boolean"&&Q(y.isAudioMuted)},[y?.isAudioMuted]);const i=r.useRef(null),O=r.useRef(null),x=r.useRef([]),f=r.useRef(null),l=r.useRef(null),D=r.useRef(!1),Y=r.useRef(!1),tt=r.useRef(c);r.useEffect(()=>{tt.current=c},[c]);const[et,G]=r.useState(null),t=r.useMemo(()=>z[b],[z,b]),F=r.useMemo(()=>t?.text?t.textPart2&&h===1?t.textPart2:p&&t.id==="step-streak"?Rt:t.text:"",[t,p,h]),A=r.useMemo(()=>t?p&&t.id==="step-streak"?Ct:h===1&&t.voicePart2?t.voicePart2:h===1?null:t.voice??null:null,[t,p,h]),rt=r.useMemo(()=>t?t.robot||(t.id==="step-final"?C:k):k,[t,C,k]),bt=t?.id==="step-intro"||t?.id==="step-companion",P=!!(!d&&p&&t?.id!=="step-final"||d&&(t?.id==="step-streak"||p&&!bt)),ht=r.useMemo(()=>P?lt:rt,[P,rt]),B=t?.targetElementId==="tutorial-target-home-streak"||t?.targetElementId==="tutorial-target-home-rank"||t?.targetElementId==="tutorial-target-home-practice",ot=t?.id==="step-streak",K=()=>{typeof document>"u"||document.querySelectorAll(".tutorial-spotlight-active").forEach(e=>{e.classList.remove("tutorial-spotlight-active")})},E=()=>{x.current.forEach(e=>{e&&(e.pause(),e.currentTime=0)}),f.current&&(f.current.pause(),f.current.currentTime=0,f.current=null)},ft=()=>{Q(e=>{const n=!e;return typeof window<"u"&&window.localStorage.setItem(X,n?"1":"0"),y?.id&&pt({is_audio_muted:n}).catch(()=>{}),n&&E(),n})};if(r.useEffect(()=>{if(!S){x.current=[];return}return x.current=[new Audio(Et),new Audio(It),new Audio(St),new Audio(At),new Audio(Pt),new Audio(jt)],x.current.forEach(e=>{e&&(e.preload="none")}),()=>{E(),x.current=[]}},[S]),r.useEffect(()=>{if(x.current.forEach(e=>{e&&(e.muted=c,c&&(e.pause(),e.currentTime=0))}),f.current&&(f.current.muted=c,c&&(f.current.pause(),f.current.currentTime=0)),!c&&a&&t){if(E(),A){const e=new Audio(A);e.muted=!1,f.current=e,e.play().catch(()=>{})}else if(S){const e=x.current[b];e&&(e.muted=!1,e.currentTime=0,e.play().catch(()=>{}))}}},[c,a,t,A,S,b]),r.useEffect(()=>{if(a){Y.current=!0,K(),J(0),U(0);return}Y.current&&I&&d&&p&&I(),Y.current=!1,K(),E(),l.current&&(window.clearInterval(l.current),l.current=null),i.current&&(i.current.classList.remove("tutorial-spotlight-active"),i.current.style.removeProperty("pointer-events"),i.current=null)},[a,I,d,p]),r.useEffect(()=>{U(0)},[b]),r.useEffect(()=>{D.current=!1},[b]),r.useEffect(()=>{if(!a||!t)return;const e=t.targetElementId;if(e!=="tutorial-target-home-streak"&&e!=="tutorial-target-home-rank"&&e!=="tutorial-target-home-practice"||typeof document>"u"||document.getElementById(e)||D.current)return;const s=document.querySelector(".activity-mobile-dashboard-section")?.querySelector("button.activity-mobile-dashboard-btn"),v=s?.textContent?.trim().toLowerCase();s&&v==="dashboard"&&(s.click(),D.current=!0)},[a,t?.id,t?.targetElementId,b]),r.useEffect(()=>{if(!a||!t)return;K(),i.current&&(i.current.classList.remove("tutorial-spotlight-active"),i.current.style.removeProperty("z-index"),i.current.style.removeProperty("pointer-events"),i.current=null);const e=t?.targetElementId,n=d&&e==="tutorial-target-home-journey"?"4600":"4800",s=e==="tutorial-target-home-streak"||e==="tutorial-target-home-rank"||e==="tutorial-target-home-practice",v=e==="tutorial-target-home-streak"||e==="tutorial-target-home-rank"||e==="tutorial-target-home-practice",W=s?48:6,w=s?80:60;let j=!1,M=null;const L=(N=0)=>{if(j||!e)return;const g=document.getElementById(e);if(g){if(g.classList.add("tutorial-spotlight-active"),g.style.setProperty("z-index",n,"important"),v&&g.style.setProperty("pointer-events","none","important"),i.current=g,e==="tutorial-target-home-practice"){const m=document.querySelector(".dashboard-overlay-scroll-content")||document.querySelector(".dashboard-overlay-content");if(m){try{m.scrollTo({top:m.scrollHeight,behavior:"smooth"})}catch{m.scrollTop=m.scrollHeight}setTimeout(()=>{m&&(m.scrollTop=m.scrollHeight)},60)}}else if(e==="tutorial-target-home-journey")try{g.scrollIntoView({behavior:"smooth",block:"start"})}catch{}else try{g.scrollIntoView({behavior:"smooth",block:"center"})}catch{}return}N>=W||(M=window.setTimeout(()=>L(N+1),w))};return e&&L(0),()=>{j=!0,M&&window.clearTimeout(M),i.current&&(i.current.classList.remove("tutorial-spotlight-active"),i.current.style.removeProperty("z-index"),i.current.style.removeProperty("pointer-events"),i.current=null)}},[a,t?.targetElementId,d]),r.useEffect(()=>{!a||!p||!d||!I||t?.targetElementId==="tutorial-target-home-journey"&&I()},[a,p,d,t?.targetElementId,b,h,I]),r.useEffect(()=>{if(!a||!t){G(null);return}if(!(!(!d&&p&&(t.id==="step-controls"||t.id==="step-soundbar"))&&(t.id==="step-controls"||t.id==="step-soundbar"||t.id==="step-roadmap"||t.id==="step-practice"))){G(null);return}let s=0,v=0;const W=()=>{const j=t.targetElementId?document.getElementById(t.targetElementId):null,M=O.current;if(!j||!M)return!1;const L=j.getBoundingClientRect(),N=M.getBoundingClientRect(),g=parseFloat(window.getComputedStyle(document.documentElement).fontSize)||16,m=t.id==="step-roadmap"?g:0,st=g*2+m,vt=Math.max(8,L.top-N.height-st);return G({top:`${vt}px`,bottom:"auto",zIndex:5100}),!0},w=()=>{s=window.requestAnimationFrame(()=>{W()||(v=window.setTimeout(w,60))})};return w(),window.addEventListener("resize",w),window.addEventListener("orientationchange",w),()=>{s&&window.cancelAnimationFrame(s),v&&window.clearTimeout(v),window.removeEventListener("resize",w),window.removeEventListener("orientationchange",w)}},[a,t?.id,t?.targetElementId,h,d,p]),r.useEffect(()=>{if(!a||!t)return;$(""),q(!1),l.current&&(window.clearInterval(l.current),l.current=null);let e=0;const n=F;if(l.current=window.setInterval(()=>{e+=1,$(n.slice(0,e)),e>=n.length&&(l.current&&(window.clearInterval(l.current),l.current=null),q(!0))},12),!tt.current){if(E(),A){const s=new Audio(A);s.muted=!1,f.current=s,s.play().catch(v=>console.warn("[TutorialOverlayMobile] Custom voice play failed:",v))}else if(S){const s=x.current[b];s&&(s.currentTime=0,s.play().catch(()=>{}))}}return()=>{l.current&&(window.clearInterval(l.current),l.current=null),E()}},[b,a,S,t?.id,F,A,h]),!a||!t)return null;const gt=()=>{if(E(),!H){$(F),q(!0),l.current&&(window.clearInterval(l.current),l.current=null);return}if(t.textPart2&&h===0){U(1);return}if(b>=z.length-1){i.current&&(i.current.classList.remove("tutorial-spotlight-active"),i.current.style.removeProperty("z-index"),i.current.style.removeProperty("pointer-events"),i.current=null),V?.(),T?.();return}J(n=>n+1)},it=`tutorial-overlay-wrapper${d?" is-custom-tutorial":" is-default-tutorial"}${t?.id==="step-controls"?" is-controls-step":""}${t?.id==="step-soundbar"?" is-soundbar-step":""}${t?.id==="step-final"?" is-final-step":""}${t?.id==="step-rank"?" is-rank-step":""}${t?.robotClassName?` ${t.robotClassName}`:""}`,at=o.jsx(o.Fragment,{children:o.jsxs("div",{className:"tutorial-companion-container",ref:O,style:B?{...et??{},pointerEvents:"auto"}:et??void 0,children:[P?null:o.jsx("img",{src:ht,alt:"",className:"tutorial-robot-img","aria-hidden":"true"}),o.jsxs("article",{className:`tutorial-speech-bubble${P?" tutorial-speech-bubble--logo":""}`,children:[o.jsx("div",{className:`tutorial-bubble-title${P?" tutorial-bubble-title--with-brand":""}`,children:P?o.jsxs(o.Fragment,{children:[o.jsx("img",{src:lt,alt:"",className:"tutorial-bubble-title-logo",width:36,height:36}),o.jsx("span",{className:"tutorial-bubble-title-label",children:t.title})]}):t.title}),o.jsx("p",{className:"tutorial-bubble-text",children:o.jsx(ct,{text:mt,fullText:F,isDone:H,emphasis:h===0?t.emphasis:void 0})}),o.jsxs("div",{className:"tutorial-bubble-footer",children:[_&&o.jsx("button",{type:"button",onClick:ft,"aria-label":c?"Unmute B-01 voice":"Mute B-01 voice",title:c?"Unmute B-01 voice":"Mute B-01 voice",className:`tutorial-audio-toggle ${c?"is-muted":"is-unmuted"}`,children:c?o.jsx(xt,{"aria-hidden":"true"}):o.jsx(wt,{"aria-hidden":"true"})}),o.jsx("button",{type:"button",className:"tutorial-bubble-btn",onClick:gt,disabled:!H,children:t.button})]})]})]})}),nt=B&&typeof document<"u"?yt.createPortal(o.jsxs(o.Fragment,{children:[ot?o.jsx("div",{className:"bigkas-modal-scrim bigkas-modal-scrim--no-enter tutorial-mobile-streak-scrim","aria-hidden":"true",style:{position:"fixed",inset:0,zIndex:1800,pointerEvents:"none",background:"rgba(15, 23, 42, 0.5)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)"}}):null,o.jsx("div",{className:it,style:{position:"fixed",inset:0,zIndex:7200,pointerEvents:"none"},"aria-label":"Training tutorial overlay",children:at})]}),document.body):null;return o.jsxs(o.Fragment,{children:[a&&ot?o.jsx("style",{children:`
          /*
           * Streak tutorial: scrim is portaled to document.body (z-index 1800). #root stacks as auto,
           * so the scrim paints above the whole app and hides the spotlight. Raise #root while this
           * step is open so dashboard content (including #tutorial-target-home-streak) stacks above the scrim.
           */
          #root {
            position: relative;
            z-index: 1850 !important;
          }
        `}):null,B?null:o.jsx("div",{className:"tutorial-dark-bg","aria-hidden":"true"}),o.jsx("style",{children:`
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
      `}),B&&nt?nt:o.jsx("section",{className:it,"aria-label":"Training tutorial overlay",children:at})]})}const Ht=r.memo(Ft);export{Ht as default};
//# sourceMappingURL=TutorialOverlayMobile-BXfn31z5.js.map
