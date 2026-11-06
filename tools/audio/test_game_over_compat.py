"""Focused container-repair checks; Chromium playback is a separate root gate."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from remux_game_over import ROOT, SOURCE, SOURCE_HASH, TARGET, digest, remux


class GameOverCompatibilityTest(unittest.TestCase):
    def test_remux_is_reproducible_lossless_and_preserves_source_and_provenance(self):
        with tempfile.TemporaryDirectory(prefix='awwv-audio-test-') as directory:
            regenerated = Path(directory) / 'game_over.ogg'
            remux(regenerated)
            self.assertEqual(digest(regenerated), digest(TARGET))
        self.assertEqual(digest(SOURCE), SOURCE_HASH)
        def decoded(path):
            return subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 's16le', 'pipe:1'],
                                  capture_output=True, check=True, timeout=15).stdout
        original_pcm = decoded(SOURCE)
        self.assertGreater(len(original_pcm), 0)
        processed_pcm = decoded(TARGET)
        # Repaired timestamps expose a 128-sample decoder tail. The original
        # 8064 samples are identical; encoded packets, not invalid timestamps,
        # define the stream-copy/no-transcode preservation guarantee.
        self.assertEqual(original_pcm, processed_pcm[:len(original_pcm)])
        self.assertEqual(len(processed_pcm) - len(original_pcm), 128 * 2)
        def packets(path):
            result = subprocess.run(['ffprobe', '-v', 'error', '-show_packets',
                                     '-show_data_hash', 'sha256', '-of', 'json', str(path)],
                                    capture_output=True, check=True, timeout=15)
            return [packet['data_hash'] for packet in json.loads(result.stdout)['packets']]
        self.assertEqual(len(packets(SOURCE)), 30)
        self.assertEqual(packets(SOURCE), packets(TARGET))
        record = json.loads((ROOT / 'docs/audio/AUDIO_ASSET_PROVENANCE.json').read_text())['cues']['game_over']
        self.assertEqual(record['original_sha256'], SOURCE_HASH)
        self.assertEqual(record['processed_sha256'], digest(TARGET))
        self.assertEqual(record['license'], 'CC0-1.0')
        self.assertEqual(record['previous_versions'][0]['processed_sha256'], SOURCE_HASH)


if __name__ == '__main__':
    unittest.main()
