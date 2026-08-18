import { useEffect, useState } from "react";
import {
  ExpandableSection,
  FormField,
  Input,
  Modal,
  Multiselect,
  Select,
  SpaceBetween,
} from "@cloudscape-design/components";
import CancelModalFooter from "@/components/CancelModalFooter";
import UuidListInput from "@/components/UuidListInput";
import WebhookAcceptGetUrlsInput from "@/components/WebhookAcceptGetUrlsInput";
import WebhookTagsInput from "@/components/WebhookTagsInput";
import UndefinedBoolInput from "@/components/UndefinedBoolInput";
import { useRegister, useUpdate } from "@/hooks/useWebhooks";
import useAlertsStore from "@/stores/useAlertsStore";

const initialWebhookData = {
  url: "",
  events: [],
  status: "created",
  api_key_name: undefined,
  api_key_value: undefined,
  flow_ids: undefined,
  source_ids: undefined,
  flow_collected_by_ids: undefined,
  source_collected_by_ids: undefined,
  accept_get_urls: undefined,
  accept_storage_ids: undefined,
  include_object_timerange: undefined,
  presigned: undefined,
  verbose_storage: undefined,
  tags: undefined,
};

const eventOptions = [
  "flows/created",
  "flows/updated",
  "flows/deleted",
  "flows/segments_added",
  "flows/segments_deleted",
  "sources/created",
  "sources/updated",
  "sources/deleted",
].map((value) => ({ label: value, value }));

const statusOptions = [
  { label: "Created", value: "created" },
  { label: "Disabled", value: "disabled" },
  {
    label: "Started",
    value: "started",
    disabled: true,
    labelTag: "System Status",
  },
  { label: "Error", value: "error", disabled: true, labelTag: "System Status" },
];

const enabledStatuses = statusOptions
  .filter((opt) => !opt.disabled)
  .map((opt) => opt.value);

const WebhookRegisterUpdateModal = ({
  modalVisible,
  setModalVisible,
  webhook,
}) => {
  const [urlError, setUrlError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useRegister();
  const { update } = useUpdate();
  const addAlertItem = useAlertsStore((state) => state.addAlertItem);
  const delAlertItem = useAlertsStore((state) => state.delAlertItem);

  const getInitialData = () => webhook ?? initialWebhookData;
  const [formData, setFormData] = useState(getInitialData());

  // TAMS doesn't return api_key_value on GET, so on Update we won't have it in
  // formData. Only require it when api_key_name was newly set or changed from
  // the webhook's current name — when unchanged, the server retains the value.
  const apiKeyValueMissing =
    formData.api_key_name !== undefined &&
    formData.api_key_name !== webhook?.api_key_name &&
    !formData.api_key_value;

  // Reset form on each open (and whenever the selected webhook changes) so
  // reopening for a different webhook doesn't show stale data from a previous edit.
  useEffect(() => {
    if (!modalVisible) return;
    setFormData(webhook ?? initialWebhookData);
    setUrlError("");
    setIsSubmitting(false);
  }, [modalVisible, webhook]);

  const postWebhook = async () => {
    setIsSubmitting(true);
    const id = crypto.randomUUID();
    try {
      if (webhook) {
        await update(formData);
      } else {
        await register(formData);
      }
      addAlertItem({
        type: "success",
        dismissible: true,
        dismissLabel: "Dismiss message",
        content: `Webhook ${webhook ? "updated" : "registered"} successfully.`,
        id,
        onDismiss: () => delAlertItem(id),
      });
    } catch (error) {
      addAlertItem({
        type: "error",
        dismissible: true,
        dismissLabel: "Dismiss message",
        content: `Failed to ${webhook ? "update" : "register"} webhook: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        id,
        onDismiss: () => delAlertItem(id),
      });
    } finally {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    setModalVisible(false);
    setFormData(getInitialData());
    setUrlError("");
    setIsSubmitting(false);
  };

  return (
    <Modal
      key={String(modalVisible)}
      onDismiss={handleDismiss}
      visible={modalVisible}
      footer={
        <CancelModalFooter
          onCancel={handleDismiss}
          onSubmit={postWebhook}
          submitText={webhook ? "Update" : "Register"}
          submitDisabled={!formData.url || apiKeyValueMissing}
          submitLoading={isSubmitting}
          cancelDisabled={isSubmitting}
        />
      }
      header={`${webhook ? "Update" : "Register"} Webhook`}
    >
      <form onSubmit={(e) => e.preventDefault()}>
        <SpaceBetween size="xs">
          <FormField
            description="The URL to which the service instance should make HTTP POST requests with event data"
            label="Url*"
            errorText={urlError}
          >
            <Input
              value={formData.url}
              onChange={({ detail }) =>
                setFormData({ ...formData, url: detail.value })
              }
              onBlur={() => {
                if (formData.url) {
                  setUrlError("");
                } else {
                  setUrlError("Url is required");
                }
              }}
            />
          </FormField>
          <FormField
            description="List of event types to receive"
            label="Events"
          >
            <Multiselect
              selectedOptions={eventOptions.filter((opt) =>
                formData.events.includes(opt.value)
              )}
              onChange={({ detail }) =>
                setFormData({
                  ...formData,
                  events: detail.selectedOptions.map((opt) => opt.value),
                })
              }
              options={eventOptions}
              inlineTokens
            />
          </FormField>
          <FormField
            description="Status of the Webhook"
            label="Status"
            errorText={
              webhook &&
              formData.status &&
              !enabledStatuses.includes(formData.status)
                ? "This status is system-managed"
                : undefined
            }
          >
            <Select
              selectedOption={
                statusOptions.find((opt) => opt.value === formData.status) ??
                null
              }
              onChange={({ detail }) =>
                setFormData({
                  ...formData,
                  status: detail.selectedOption.value,
                })
              }
              options={statusOptions}
            />
          </FormField>
          <ExpandableSection
            headerText="API Key Auth"
            defaultExpanded={!!webhook?.api_key_name}
          >
            <SpaceBetween size="m">
              <FormField
                description="The HTTP header name that is added to the event POST"
                label="API Key Name"
              >
                <Input
                  value={formData.api_key_name ?? ""}
                  onChange={({ detail }) => {
                    if (!detail.value) {
                      setFormData({
                        ...formData,
                        api_key_name: undefined,
                        api_key_value: undefined,
                      });
                    } else {
                      setFormData({
                        ...formData,
                        api_key_name: detail.value,
                      });
                    }
                  }}
                />
              </FormField>
              <FormField
                description={
                  webhook?.api_key_name &&
                  formData.api_key_name === webhook.api_key_name
                    ? "Leave blank to keep the current value. Fill in to replace it."
                    : "The value that the HTTP header 'api_key_name' will be set to"
                }
                label="API Key Value"
                errorText={
                  apiKeyValueMissing
                    ? "API Key Value is required when API Key Name is set or changed"
                    : undefined
                }
              >
                <Input
                  value={formData.api_key_value ?? ""}
                  disabled={!formData.api_key_name}
                  onChange={({ detail }) =>
                    setFormData({
                      ...formData,
                      api_key_value: detail.value || undefined,
                    })
                  }
                  type="password"
                  spellcheck={false}
                  disableBrowserAutocorrect
                />
              </FormField>
            </SpaceBetween>
          </ExpandableSection>
          <ExpandableSection headerText="Advanced">
            <SpaceBetween size="m">
              <UuidListInput
                description="Limit Flow and Flow Segment events to Flows in the given list of Flow IDs"
                label="Flow Ids"
                uuids={formData.flow_ids}
                setUuids={(ids) =>
                  setFormData((prev) => ({
                    ...prev,
                    flow_ids:
                      typeof ids === "function" ? ids(prev.flow_ids) : ids,
                  }))
                }
              />
              <UuidListInput
                description="Limit Flow, Flow Segment and Source events to Sources in the given list of Source IDs"
                label="Source Ids"
                uuids={formData.source_ids}
                setUuids={(ids) =>
                  setFormData((prev) => ({
                    ...prev,
                    source_ids:
                      typeof ids === "function" ? ids(prev.source_ids) : ids,
                  }))
                }
              />
              <UuidListInput
                description="Limit Flow and Flow Segment events to those with Flow that is collected by a Flow Collection in the given list of Flow Collection IDs"
                label="Flow Collected By Ids"
                uuids={formData.flow_collected_by_ids}
                setUuids={(ids) =>
                  setFormData((prev) => ({
                    ...prev,
                    flow_collected_by_ids:
                      typeof ids === "function"
                        ? ids(prev.flow_collected_by_ids)
                        : ids,
                  }))
                }
              />
              <UuidListInput
                description="Limit Flow, Flow Segment and Source events to those with Source that is collected by a Source Collection in the given list of Source Collection IDs"
                label="Source Collected By Ids"
                uuids={formData.source_collected_by_ids}
                setUuids={(ids) =>
                  setFormData((prev) => ({
                    ...prev,
                    source_collected_by_ids:
                      typeof ids === "function"
                        ? ids(prev.source_collected_by_ids)
                        : ids,
                  }))
                }
              />
              <WebhookAcceptGetUrlsInput
                description="List of labels of URLs to include in the get_urls property in flows/segments_added events"
                label="Accept Get Urls"
                values={formData.accept_get_urls}
                setValues={(ids) =>
                  setFormData((prev) => ({
                    ...prev,
                    accept_get_urls:
                      typeof ids === "function"
                        ? ids(prev.accept_get_urls)
                        : ids,
                  }))
                }
              />
              <UuidListInput
                description="List of storage_ids to include in the get_urls property in flows/segments_added events"
                label="Accept Storage Ids"
                uuids={formData.accept_storage_ids}
                setUuids={(ids) =>
                  setFormData((prev) => ({
                    ...prev,
                    accept_storage_ids:
                      typeof ids === "function"
                        ? ids(prev.accept_storage_ids)
                        : ids,
                  }))
                }
              />
              <UndefinedBoolInput
                description="Whether to include object_timerange in flows/segments_added events. Added in TAMS 8.2 to match the HTTP API"
                label="Include Object Timerange"
                undefinedBool={formData.include_object_timerange}
                setUndefinedBool={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    include_object_timerange:
                      typeof v === "function"
                        ? v(prev.include_object_timerange)
                        : v,
                  }))
                }
              />
              <UndefinedBoolInput
                description="Whether to include presigned/non-presigned URLs in the get_urls property in flows/segments_added events"
                label="Presigned"
                undefinedBool={formData.presigned}
                setUndefinedBool={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    presigned: typeof v === "function" ? v(prev.presigned) : v,
                  }))
                }
              />
              <UndefinedBoolInput
                description="Whether to include storage metadata in the get_urls property in flows/segments_added events"
                label="Verbose Storage"
                undefinedBool={formData.verbose_storage}
                setUndefinedBool={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    verbose_storage:
                      typeof v === "function" ? v(prev.verbose_storage) : v,
                  }))
                }
              />
            </SpaceBetween>
          </ExpandableSection>
          <ExpandableSection headerText="Tags">
            <WebhookTagsInput
              description="Key is a freeform string. Value is a freeform string, or an array of freeform strings"
              tags={formData.tags}
              setTags={(tags) =>
                setFormData((prev) => ({
                  ...prev,
                  tags: typeof tags === "function" ? tags(prev.tags) : tags,
                }))
              }
            />
          </ExpandableSection>
        </SpaceBetween>
      </form>
    </Modal>
  );
};

export default WebhookRegisterUpdateModal;
