import copy
import importlib
import tempfile
from pathlib import Path
import unittest

class CampaignScoreChecks(unittest.TestCase):
    def setUp(self):
        self.s = importlib.import_module('create_campaign_suite')
    def test_complete_distinct_scores(self):
        suite = [self.s.composition(k) for k in self.s.TRACKS]
        self.s.validate_suite(suite)
        self.assertEqual(len(suite),8)
        self.assertTrue({'6/8','3/4','4/4'} <= {x['meter'] for x in suite})
        for score in suite:
            self.assertTrue(180 <= score['duration_seconds'] <= 240)
            self.assertGreater(len(score['notes']), 150)
            self.assertGreaterEqual(len(score['sections']), 5)
    def test_long_note_cannot_outlast_harmony(self):
        score=self.s.composition('country')
        score['notes'][0]['duration']=10
        with self.assertRaisesRegex(ValueError,'harmony'):
            self.s.validate(score)
    def test_new_tracks_have_distinct_lead_palettes(self):
        leads={k:{n['track'] for n in self.s.composition(k)['notes'] if n['role']=='lead melody'} for k in ['radio','life','table','maps','after']}
        self.assertIn('clarinet',leads['life'])
        self.assertIn('horn',leads['radio'])
        self.assertIn('cello',leads['maps'])
        self.assertIn('piano',leads['table'])
        self.assertIn('bassoon',leads['after'])
    def test_transposed_duplicate_theme_rejected(self):
        suite=[self.s.composition(k) for k in self.s.TRACKS]
        suite[1]['theme']=[p+7 for p in suite[0]['theme']]
        with self.assertRaisesRegex(ValueError, 'theme'):
            self.s.validate_suite(suite)
    def test_bad_time_duration_velocity_and_nonfinite_rejected(self):
        for field,value in [('time',-1),('duration',0),('midi',float('nan')),('velocity',128),('time',9999)]:
            score=self.s.composition('country')
            score['notes'][0][field]=value
            with self.subTest(field=field,value=value),self.assertRaises(ValueError):
                self.s.validate(score)
    def test_no_notes_or_unknown_instrument_rejected(self):
        score=self.s.composition('winter');score['notes']=[]
        with self.assertRaises(ValueError):self.s.validate(score)
        score=self.s.composition('winter');score['notes'][0]['track']='synth'
        with self.assertRaises(ValueError):self.s.validate(score)
    def test_missing_structural_contrast_rejected(self):
        score=self.s.composition('lines');score['sections']=score['sections'][:1]
        with self.assertRaisesRegex(ValueError,'section'):self.s.validate(score)
    def test_resource_cap_includes_cached_new_files(self):
        self.s.check_resource_budget([20_000_000,20_000_000])
        with self.assertRaisesRegex(ValueError,'40MB'):
            self.s.check_resource_budget([39_999_999,2])
    def test_sparse_piano_gain_uses_owner_headroom_without_compression(self):
        import math
        gain=self.s.mastering_gain(-20.4,-2.5,'table')
        change=20*math.log10(gain)
        self.assertGreaterEqual(-20.4+change,-20.1)
        self.assertLessEqual(-2.5+change,-2.0)
        self.assertGreater(gain,1)
    def test_attempt_refuses_existing_output(self):
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/'attempt';self.s.fresh_output(path)
            (path/'retained.txt').write_text('original')
            with self.assertRaises(FileExistsError):self.s.fresh_output(path)
            self.assertEqual((path/'retained.txt').read_text(),'original')

if __name__=='__main__':unittest.main()
