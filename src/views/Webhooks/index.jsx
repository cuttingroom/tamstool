import {
  Alert,
  Box,
  Button,
  Header,
  Modal,
  Pagination,
  SpaceBetween,
  Table,
  TextFilter,
} from "@cloudscape-design/components";

import { useState } from "react";
import { useCollection } from "@cloudscape-design/collection-hooks";
import { useWebhooks, useDeleteWebhook } from "@/hooks/useWebhooks";
import { PAGE_SIZE } from "@/constants";

const columnDefinitions = [
  {
    id: "id",
    header: "Id",
    cell: (item) => item.id,
    sortingField: "id",
    isRowHeader: true,
    width: 360,
  },
  {
    id: "events",
    header: "Events",
    cell: (item) =>
      Array.isArray(item.events) ? item.events.join(", ") : item.events,
    sortingField: "events",
  },
  {
    id: "callback_url",
    header: "Callback URL",
    cell: (item) => item.callback_url,
    sortingField: "callback_url",
  },
  {
    id: "label",
    header: "Label",
    cell: (item) => item.label,
    sortingField: "label",
  },
  {
    id: "description",
    header: "Description",
    cell: (item) => item.description,
    sortingField: "description",
  },
  {
    id: "created",
    header: "Created",
    cell: (item) => item.created,
    sortingField: "created",
  },
  {
    id: "updated",
    header: "Updated",
    cell: (item) => item.updated,
    sortingField: "updated",
  },
];

const Webhooks = () => {
  const { webhooks, mutate, isLoading, error } = useWebhooks();
  const { del, isDeleting } = useDeleteWebhook();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { items, collectionProps, filterProps, paginationProps } =
    useCollection(isLoading || error ? [] : webhooks ?? [], {
      filtering: {
        empty: (
          <Box margin={{ vertical: "xs" }} textAlign="center" color="inherit">
            <b>No webhooks</b>
          </Box>
        ),
        noMatch: (
          <Box margin={{ vertical: "xs" }} textAlign="center" color="inherit">
            <b>No matches</b>
          </Box>
        ),
      },
      pagination: { pageSize: PAGE_SIZE },
      sorting: {
        defaultState: {
          sortingColumn: columnDefinitions.find((col) => col.id === "created"),
          isDescending: true,
        },
      },
      selection: {},
    });

  const selectedItem = collectionProps.selectedItems?.[0];

  const handleDelete = async () => {
    if (!selectedItem) return;
    await del({ webhookId: selectedItem.id });
    setShowDeleteModal(false);
    mutate();
  };

  if (error) {
    return (
      <Alert type="error" header="Could not load webhooks">
        Failed to load webhooks from the active store. The store may not support
        webhooks, or the endpoint may be unreachable.
        <Box
          margin={{ top: "xs" }}
          color="text-body-secondary"
          fontSize="body-s"
        >
          {error.message}
        </Box>
      </Alert>
    );
  }

  return (
    <>
      <Table
        header={
          <Header
            actions={
              <Button
                disabled={!selectedItem}
                loading={isDeleting}
                onClick={() => setShowDeleteModal(true)}
              >
                Delete
              </Button>
            }
          >
            Webhooks
          </Header>
        }
        {...collectionProps}
        selectionType="single"
        variant="borderless"
        loadingText="Loading webhooks"
        loading={isLoading}
        trackBy="id"
        columnDefinitions={columnDefinitions}
        contentDensity="compact"
        items={items}
        pagination={<Pagination {...paginationProps} />}
        filter={<TextFilter {...filterProps} />}
      />
      <Modal
        visible={showDeleteModal}
        onDismiss={() => setShowDeleteModal(false)}
        header="Delete webhook"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                variant="link"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={isDeleting}
                onClick={handleDelete}
              >
                Delete
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        Are you sure you want to delete webhook{" "}
        <b>{selectedItem?.id}</b>?
      </Modal>
    </>
  );
};

export default Webhooks;
