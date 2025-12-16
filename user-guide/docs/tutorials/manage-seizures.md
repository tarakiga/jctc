# Manage Seizures

The **Seizures** module allows you to document physical raid operations and the collection of evidence from specific locations. It links legal authority (warrants) to the physical act of seizing items.

## Logging a New Seizure
1. Open a Case and navigate to the **Seizures** tab.
2. Click **Log Seizure**.
3. **Complete the Form**:
    *   **Date & Time**: When the seizure took place.
    *   **Location**: The physical address where items were seized.
    *   **Seizing Officer**: The lead officer on the scene (defaults to you).
    *   **Legal Authorization**: Link this seizure to an existing **Search Warrant** or **Court Order**.
        *   *Tip: If the warrant isn't in the system yet, you can enter manual details, but linking is recommended.*
    *   **Description**: Detailed narrative of the operation.
    *   **Witnesses**: Add names of independent witnesses present during the seizure.
4. Click **Log Seizure** to save.

## Linking Evidence to Seizures
Once a seizure record is created, you can link individual evidence items to it.

1. Go to the **Evidence Management** tab.
2. When adding or editing an evidence item, look for the **Seizure** dropdown.
3. Select the relevant seizure record (e.g., *"Seizure at 45 Allen Ave..."*).

This creates a bidirectional link:
- Viewing the **Seizure** will show a count and list of all items collected during that operation.
- Viewing an **Evidence Item** will show exactly when and where it was seized.

## Editing Seizure Records
If details need correction (e.g., adding a late witness statement):
1. Find the seizure card in the list.
2. Click **Edit**.
3. Update the necessary fields.
4. **Note**: Changing the *Date/Time* or *Location* may flag an audit warning if evidence items are already linked, as their chain of custody root often stems from this event.
