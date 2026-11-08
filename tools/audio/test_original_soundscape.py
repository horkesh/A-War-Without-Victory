import unittest
import hashlib
import json
import subprocess
import numpy as np
from generate_original_soundscape import SR, ROOT, music, effect, pcm24, EFFECTS, R7_CONTACTS, r7_effect


class OriginalSoundscapeTest(unittest.TestCase):
    def test_effects_are_repeatable_tactile_and_bounded(self):
        self.assertEqual(len(EFFECTS), 8)
        for cue in EFFECTS:
            a, b = effect(cue), effect(cue)
            self.assertTrue(np.array_equal(a, b), cue)
            self.assertGreaterEqual(len(a), int(.1 * SR))
            self.assertLessEqual(len(a), int(.7 * SR))
            self.assertTrue(np.isfinite(a).all())
            self.assertLess(np.max(np.abs(a)), .5)
            self.assertEqual(a[0], 0)
            self.assertEqual(a[-1], 0)
            record = self.provenance()[cue]
            self.assertEqual(hashlib.sha256(pcm24(a)).hexdigest(), record['original_sha256'])

    def test_music_stems_are_exact_duration_and_sum_without_clipping(self):
        stems = music()
        self.assertEqual(set(stems), {'piano', 'strings', 'texture', 'percussion'})
        mix = sum(stems.values())
        self.assertEqual(mix.shape, (90 * SR, 2))
        self.assertTrue(np.isfinite(mix).all())
        self.assertLess(np.max(np.abs(mix)), .7)
        self.assertGreater(np.sqrt(np.mean(mix**2)), .01)
        self.assertTrue(np.all(mix[0] == 0))
        self.assertTrue(np.all(mix[-1] == 0))
        menu = self.provenance()['menu_theme']
        original = next(version for version in [menu, *menu.get('previous_versions', [])]
                        if version['file'].endswith('/menu_original.ogg'))
        self.assertEqual(hashlib.sha256(pcm24(mix)).hexdigest(), original['original_sha256'])

    @staticmethod
    def provenance():
        return json.loads((ROOT / 'docs/audio/AUDIO_ASSET_PROVENANCE.json').read_text())['cues']

    def test_published_files_and_preserved_sources_match_recorded_hashes(self):
        records = self.provenance()
        for cue in [*EFFECTS, *R7_CONTACTS, 'menu_theme']:
            record = records[cue]
            for version in [record, *record.get('previous_versions', [])]:
                data = (ROOT / version['file']).read_bytes()
                self.assertTrue(data.startswith(b'OggS'))
                self.assertEqual(hashlib.sha256(data).hexdigest(), version['processed_sha256'])
                self.assertTrue((ROOT / version['license_note']).exists())
            self.assertGreater(record['loudness_lufs'], -69)

    def test_r7_interface_masters_match_provenance(self):
        records = self.provenance()
        self.assertEqual([version['license'] for version in records['turn_complete']['previous_versions']],
                         ['FIRST_PARTY', 'CC0-1.0'])
        hashes = set()
        for cue in R7_CONTACTS:
            samples = r7_effect(cue)
            digest = hashlib.sha256(pcm24(samples)).hexdigest()
            self.assertEqual(samples[0], 0, cue)
            self.assertEqual(samples[-1], 0, cue)
            self.assertEqual(digest, records[cue]['original_sha256'], cue)
            self.assertEqual(records[cue]['license'], 'FIRST_PARTY', cue)
            self.assertTrue(any(version['license'] == 'CC0-1.0' for version in records[cue]['previous_versions']), cue)
            hashes.add(digest)
        self.assertEqual(len(hashes), len(R7_CONTACTS))

    def test_turn_complete_has_packet_timestamps_through_the_tail(self):
        path = ROOT / self.provenance()['turn_complete']['file']
        packets = json.loads(subprocess.check_output([
            'ffprobe', '-v', 'error', '-select_streams', 'a:0',
            '-show_entries', 'packet=pts', '-of', 'json', str(path),
        ], timeout=15))['packets']
        self.assertTrue(packets)
        self.assertTrue(all(isinstance(packet.get('pts'), int) for packet in packets))


if __name__ == '__main__':
    unittest.main()
