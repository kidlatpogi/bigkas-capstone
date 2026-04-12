import RubikCubeCanvas from '../../../components/common/RubikCubeCanvas';
import ShapeGrid from '../../../components/common/ShapeGrid';

export default function LandingScienceSection() {
  return (
    <section id="science" className="science-section">
      <ShapeGrid
        direction="diagonal"
        speed={0.6}
        borderColor="#ffffff"
        squareSize={60}
        hoverFillColor="rgba(241, 143, 1, 0.2)"
        shape="square"
        className="science-grid-bg"
      />
      <div className="section-shell science-shell">
        <div className="science-copy">
          <h2>Engineered for Precision</h2>
          <h3>
            Beyond a recorder-a diagnostic instrument built on validated speech standards.
          </h3>
          <p>
            Bigkas is grounded in the intersection of Linguistics, Biometry, and Affective Computing. We don't just listen-we analyze the micro-fluctuations in your performance. By leveraging established algorithms used by speech experts and researchers, we provide the objective data necessary to bridge the gap between social anxiety and articulate communication.
          </p>
        </div>

        <RubikCubeCanvas className="science-cube-stage" ariaLabel="3D Rubik's cube canvas" />
      </div>
    </section>
  );
}