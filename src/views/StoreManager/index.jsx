import { useState } from "react";
import {
  Box,
  Button,
  Form,
  FormField,
  Header,
  Input,
  Modal,
  SpaceBetween,
  StatusIndicator,
  Table,
  Tabs,
} from "@cloudscape-design/components";
import useStoreManager from "@/stores/useStoreManager";

const AUTH_LABELS = {
  none: "None",
  bearer: "Bearer Token",
  client_credentials: "Client / Secret",
};

const StoreManager = () => {
  const stores = useStoreManager((s) => s.stores);
  const activeStoreId = useStoreManager((s) => s.activeStoreId);
  const addStore = useStoreManager((s) => s.addStore);
  const removeStore = useStoreManager((s) => s.removeStore);
  const updateStore = useStoreManager((s) => s.updateStore);
  const setActiveStore = useStoreManager((s) => s.setActiveStore);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [formName, setFormName] = useState("");
  const [formEndpoint, setFormEndpoint] = useState("");
  const [formAuthType, setFormAuthType] = useState("none");
  const [formToken, setFormToken] = useState("");
  const [formTokenUrl, setFormTokenUrl] = useState("");
  const [formClientId, setFormClientId] = useState("");
  const [formClientSecret, setFormClientSecret] = useState("");
  const [testStatus, setTestStatus] = useState(null);

  const resetForm = () => {
    setFormName("");
    setFormEndpoint("");
    setFormAuthType("none");
    setFormToken("");
    setFormTokenUrl("");
    setFormClientId("");
    setFormClientSecret("");
    setTestStatus(null);
    setEditingStore(null);
  };

  const handleAdd = () => {
    resetForm();
    setModalVisible(true);
  };

  const handleEdit = (store) => {
    setEditingStore(store);
    setFormName(store.name);
    setFormEndpoint(store.endpoint);
    setFormAuthType(store.authType || (store.token ? "bearer" : "none"));
    setFormToken(store.token || "");
    setFormTokenUrl(store.tokenUrl || "");
    setFormClientId(store.clientId || "");
    setFormClientSecret(store.clientSecret || "");
    setTestStatus(null);
    setModalVisible(true);
  };

  const buildStoreData = () => {
    const base = {
      name: formName.trim(),
      endpoint: formEndpoint.trim().replace(/\/+$/, ""),
      authType: formAuthType,
    };
    if (formAuthType === "bearer") {
      return { ...base, token: formToken.trim() || null, tokenUrl: null, clientId: null, clientSecret: null };
    }
    if (formAuthType === "client_credentials") {
      return {
        ...base,
        token: null,
        tokenUrl: formTokenUrl.trim(),
        clientId: formClientId.trim(),
        clientSecret: formClientSecret.trim(),
      };
    }
    return { ...base, token: null, tokenUrl: null, clientId: null, clientSecret: null };
  };

  const handleSave = () => {
    const storeData = buildStoreData();
    if (editingStore) {
      updateStore(editingStore.id, storeData);
    } else {
      addStore(storeData);
    }
    setModalVisible(false);
    resetForm();
  };

  const getTestToken = async () => {
    if (formAuthType === "bearer") {
      return formToken.trim() || null;
    }
    if (formAuthType === "client_credentials") {
      const response = await fetch(formTokenUrl.trim(), {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${formClientId.trim()}:${formClientSecret.trim()}`)}`,
        },
        body: "grant_type=client_credentials",
      });
      if (!response.ok) throw new Error("Token request failed");
      const data = await response.json();
      return data.access_token;
    }
    return null;
  };

  const handleTest = async () => {
    setTestStatus("loading");
    try {
      const endpoint = formEndpoint.trim().replace(/\/+$/, "");
      const headers = { "Content-Type": "application/json" };
      const token = await getTestToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch(`${endpoint}/sources?limit=1`, { headers });
      setTestStatus(response.ok ? "success" : "error");
    } catch {
      setTestStatus("error");
    }
  };

  const isFormValid = formName.trim() && formEndpoint.trim();

  return (
    <SpaceBetween size="l">
      <Table
        header={
          <Header
            actions={
              <Button variant="primary" onClick={handleAdd}>
                Add Store
              </Button>
            }
            description="Connect to TAMS store endpoints. Credentials are stored only in your browser's localStorage."
          >
            TAMS Stores
          </Header>
        }
        items={stores}
        trackBy="id"
        variant="borderless"
        empty={
          <Box textAlign="center" color="inherit" padding="l">
            <SpaceBetween size="m">
              <b>No stores configured</b>
              <Box color="text-body-secondary">
                Add a TAMS store endpoint to get started.
              </Box>
              <Button onClick={handleAdd}>Add Store</Button>
            </SpaceBetween>
          </Box>
        }
        columnDefinitions={[
          {
            id: "active",
            header: "",
            width: 120,
            cell: (item) =>
              item.id === activeStoreId ? (
                <StatusIndicator type="success">Active</StatusIndicator>
              ) : (
                <Button
                  variant="inline-link"
                  onClick={() => setActiveStore(item.id)}
                >
                  Set Active
                </Button>
              ),
          },
          {
            id: "name",
            header: "Name",
            cell: (item) => item.name,
          },
          {
            id: "endpoint",
            header: "Endpoint",
            cell: (item) => item.endpoint,
          },
          {
            id: "auth",
            header: "Auth",
            width: 140,
            cell: (item) => AUTH_LABELS[item.authType] || AUTH_LABELS.none,
          },
          {
            id: "actions",
            header: "Actions",
            width: 300,
            cell: (item) => (
              <SpaceBetween size="xs" direction="horizontal">
                <Button
                  variant="inline-link"
                  onClick={() => handleEdit(item)}
                >
                  Edit
                </Button>
                <Button
                  variant="inline-link"
                  onClick={() => removeStore(item.id)}
                >
                  Remove
                </Button>
              </SpaceBetween>
            ),
          },
        ]}
      />

      <Modal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        header={editingStore ? "Edit Store" : "Add Store"}
        size="medium"
        footer={
          <Box float="right">
            <SpaceBetween size="xs" direction="horizontal">
              <Button variant="link" onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
              <Button
                variant="link"
                onClick={handleTest}
                disabled={!formEndpoint.trim()}
              >
                {testStatus === "loading" ? (
                  <StatusIndicator type="loading">Testing</StatusIndicator>
                ) : testStatus === "success" ? (
                  <StatusIndicator type="success">Connected</StatusIndicator>
                ) : testStatus === "error" ? (
                  <StatusIndicator type="error">Failed</StatusIndicator>
                ) : (
                  "Test Connection"
                )}
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!isFormValid}
              >
                {editingStore ? "Save" : "Add"}
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <Form>
          <SpaceBetween size="m">
            <FormField label="Name" description="A friendly name for this store.">
              <Input
                value={formName}
                onChange={({ detail }) => setFormName(detail.value)}
                placeholder="My TAMS Store"
              />
            </FormField>
            <FormField
              label="Endpoint URL"
              description="The base URL of the TAMS API."
            >
              <Input
                value={formEndpoint}
                onChange={({ detail }) => setFormEndpoint(detail.value)}
                placeholder="https://tams.example.com"
                type="url"
              />
            </FormField>
            <FormField label="Authentication">
              <Tabs
                activeTabId={formAuthType}
                onChange={({ detail }) => {
                  setFormAuthType(detail.activeTabId);
                  setTestStatus(null);
                }}
                tabs={[
                  {
                    id: "none",
                    label: "None",
                    content: (
                      <Box color="text-body-secondary" padding={{ top: "s" }}>
                        No authentication. Use for public TAMS endpoints.
                      </Box>
                    ),
                  },
                  {
                    id: "bearer",
                    label: "Bearer Token",
                    content: (
                      <Box padding={{ top: "s" }}>
                        <FormField description="A static Bearer token sent with every request.">
                          <Input
                            value={formToken}
                            onChange={({ detail }) => setFormToken(detail.value)}
                            placeholder="Token"
                            type="password"
                          />
                        </FormField>
                      </Box>
                    ),
                  },
                  {
                    id: "client_credentials",
                    label: "Client / Secret",
                    content: (
                      <SpaceBetween size="s">
                        <Box padding={{ top: "s" }}>
                          <FormField
                            label="Token URL"
                            description="The OAuth2 token endpoint."
                          >
                            <Input
                              value={formTokenUrl}
                              onChange={({ detail }) => setFormTokenUrl(detail.value)}
                              placeholder="https://auth.example.com/oauth2/token"
                              type="url"
                            />
                          </FormField>
                        </Box>
                        <FormField label="Client ID">
                          <Input
                            value={formClientId}
                            onChange={({ detail }) => setFormClientId(detail.value)}
                            placeholder="Client ID"
                          />
                        </FormField>
                        <FormField label="Client Secret">
                          <Input
                            value={formClientSecret}
                            onChange={({ detail }) => setFormClientSecret(detail.value)}
                            placeholder="Client Secret"
                            type="password"
                          />
                        </FormField>
                      </SpaceBetween>
                    ),
                  },
                ]}
              />
            </FormField>
          </SpaceBetween>
        </Form>
      </Modal>
    </SpaceBetween>
  );
};

export default StoreManager;
