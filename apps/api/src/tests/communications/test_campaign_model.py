
from src.db.communications import CampaignRead


class TestCampaignRead:
    def test_model_validate_accepts_null_json_fields(self):
        campaign = CampaignRead.model_validate(
            {
                "id": 1,
                "org_id": 2,
                "campaign_uuid": "abc",
                "subject": "Test",
                "body": None,
                "target_type": "ALL",
                "target_metadata": None,
                "send_via_email": True,
                "send_via_chat": False,
                "campaign_type": "COURSE_MARKETING",
                "preheader": None,
                "sender_name": None,
                "reply_to_email": None,
                "content_json": None,
                "scheduled_at": None,
                "started_at": None,
                "completed_at": None,
                "failed_count": 0,
                "skipped_count": 0,
                "retry_count": 0,
                "status": "DRAFT",
                "total_targets": 0,
                "sent_count": 0,
                "creation_date": "",
                "update_date": "",
            }
        )

        assert campaign.target_metadata == {}
        assert campaign.content_json == {}
