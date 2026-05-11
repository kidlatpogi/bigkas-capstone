import { motion, useScroll, useTransform } from 'framer-motion';
import { IoAnalytics, IoBarChart, IoFlask, IoPulse, IoShieldCheckmark, IoInfinite } from 'react-icons/io5';
import ShapeGrid from '../../../components/common/ShapeGrid';
import { getSpriteUrl } from '../../../utils/assetUtils';

export default function LandingScienceSection() {
  const robotAnalyst = getSpriteUrl('Robot/0002.webp');

  return (
    <section id="science" className="science-section-premium">
      <div className="science-aurora"></div>
      
      <ShapeGrid
        direction="diagonal"
        speed={0.2}
        borderColor="rgba(5, 150, 105, 0.1)"
        squareSize={100}
        hoverFillColor="rgba(5, 150, 105, 0.05)"
        shape="square"
        className="science-grid-bg"
      />
      
      <div className="section-shell science-shell-premium">
        <div className="science-copy-center">
          <motion.div 
            className="premium-tag"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <IoFlask /> <span>Precision Methodology</span>
          </motion.div>

          <motion.h2 
            className="premium-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            The Science of <span>Self-Assurance</span>
          </motion.h2>

          <motion.p 
            className="premium-subtitle"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            Bigkas isn't just a tool; it's a diagnostic instrument. We bridge the gap between social anxiety and articulate communication through validated biometric analysis.
          </motion.p>
        </div>

        <div className="holographic-display">
          {/* Central Character */}
          <motion.div 
            className="robot-hero-wrap"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <div className="robot-aura"></div>
            <img 
              src={robotAnalyst} 
              srcSet={robotAnalyst.replace('.webp', '.png')}
              alt="B-01 Analyst" 
              className="robot-hero-img" 
              loading="lazy"
            />
            
            {/* Pulsing Data Waves */}
            <div className="data-wave wave-1"></div>
            <div className="data-wave wave-2"></div>
          </motion.div>

          {/* Floating Glass Cards */}
          <div className="floating-cards-container">
            {[
              { icon: <IoPulse />, title: "Biometric Scans", desc: "Analyzing vocal micro-fluctuations.", pos: "top-left" },
              { icon: <IoAnalytics />, title: "Linguistic Depth", desc: "Measuring syntax and fluency.", pos: "top-right" },
              { icon: <IoShieldCheckmark />, title: "Validated Data", desc: "Based on speech research.", pos: "bottom-left" },
              { icon: <IoInfinite />, title: "Adaptive Path", desc: "Journey shifts with your growth.", pos: "bottom-right" }
            ].map((card, i) => (
              <motion.div 
                key={i}
                className={`glass-feature-card ${card.pos}`}
                initial={{ opacity: 0, x: card.pos.includes('left') ? -30 : 30, y: card.pos.includes('top') ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + (i * 0.15), duration: 0.6 }}
                whileHover={{ y: -10, scale: 1.02 }}
              >
                <div className="glass-card-icon">{card.icon}</div>
                <div className="glass-card-content">
                  <h4>{card.title}</h4>
                  <p>{card.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}