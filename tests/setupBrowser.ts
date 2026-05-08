// Loads the same CSS pipeline the styles tests use, so tests under
// tests/src/browser/ that need CSS-resolved tokens or stylesheet introspection
// (e.g., the merged token / modifier / element parity tests) work without
// duplicating the import sequence.
import './setup.css'
import '../src/styles/index.scss'
