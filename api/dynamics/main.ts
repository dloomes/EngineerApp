// Azure Functions v4 programmatic entry point.
// Each function file registers itself via app.http(...) when imported.

import './functions/installation/getJob';
import './functions/installation/getJobLines';
import './functions/installation/getSites';
import './functions/installation/getRooms';
import './functions/installation/createSite';
import './functions/installation/updateSite';
import './functions/installation/createRoom';
import './functions/installation/updateRoom';
import './functions/installation/createAsset';
